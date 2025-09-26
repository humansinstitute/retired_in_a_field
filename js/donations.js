// Minimal dependency-free Donations viewer using native WebSocket to a Nostr relay.
(function () {
  const mountEl = document.getElementById('donations-root');
  if (!mountEl) return;

  const DEFAULT_NPUB = 'npub1ee46qlg09wa9atzuc977urrm7ptkrfqs5uypfstnaxn7370vgcrq8tz3ua';
  const HARD_RECIPIENT_NPUB = 'npub1dvmcpmefwtnn6dctsj3728n64xhrf06p9yude77echmrkgs5zmyqw33jdm';
  const FIXED_RELAY = 'wss://relay.primal.net/';

  // Bech32 (npub) decode to hex (minimal implementation)
  const ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  function bech32Polymod(values){
    const GENERATORS = [0x3b6a57b2,0x26508e6d,0x1ea119fa,0x3d4233dd,0x2a1462b3];
    let chk = 1;
    for (const v of values){
      const top = chk >>> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ v;
      for (let i=0;i<5;i++) chk ^= ((top >> i) & 1) ? GENERATORS[i] : 0;
    }
    return chk;
  }
  function bech32HrPExpand(h){
    const ret=[]; for (let i=0;i<h.length;i++) ret.push(h.charCodeAt(i)>>5);
    ret.push(0); for (let i=0;i<h.length;i++) ret.push(h.charCodeAt(i)&31); return ret;
  }
  function bech32Decode(str){
    const s = str.toLowerCase();
    const pos = s.lastIndexOf('1');
    if (pos<1) throw new Error('invalid');
    const hrp = s.slice(0,pos);
    const data = s.slice(pos+1).split('').map(ch=>{const v=ALPHABET.indexOf(ch); if(v<0) throw new Error('bad'); return v;});
    if (bech32Polymod(bech32HrPExpand(hrp).concat(data)) !== 1) throw new Error('checksum');
    return { hrp, data: data.slice(0,-6) };
  }
  function convertBits(data, from, to, pad) {
    let acc = 0, bits = 0, ret = [], maxv = (1 << to) - 1, maxAcc = (1 << (from + to - 1)) - 1;
    for (const value of data) {
      if (value < 0 || (value >> from) !== 0) return null;
      acc = ((acc << from) | value) & maxAcc;
      bits += from;
      while (bits >= to) {
        bits -= to;
        ret.push((acc >> bits) & maxv);
      }
    }
    if (pad) {
      if (bits > 0) ret.push((acc << (to - bits)) & maxv);
    } else if (bits >= from || ((acc << (to - bits)) & maxv)) {
      return null;
    }
    return ret;
  }
  function npubToHex(npub){
    const { hrp, data } = bech32Decode(npub);
    if (hrp !== 'npub') throw new Error('wrong hrp');
    const bytes = convertBits(data, 5, 8, false);
    return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function short(p){ return p ? p.slice(0,8) + '…' + p.slice(-8) : 'unknown'; }

  // UI helpers
  function el(tag, attrs={}, children=[]) {
    const e = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      if (typeof c === 'string') e.appendChild(document.createTextNode(c)); else e.appendChild(c);
    }
    return e;
  }

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    .zap-list{display:flex;flex-direction:column;gap:14px}
    .zap{display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:12px;border:1px solid var(--border-primary);background: var(--bg-primary); box-shadow: var(--shadow-sm)}
    .row{display:flex;align-items:center;gap:10px}
    .avatar{width:36px;height:36px;border-radius:50%;overflow:hidden;background: var(--bg-tertiary);border:1px solid var(--border-secondary);flex:0 0 36px}
    .avatar img{width:100%;height:100%;object-fit:cover}
    .who{display:flex;flex-direction:column}
    .line{font-weight:600;color: var(--text-primary)}
    .muted{color: var(--text-muted);font-size:12px}
    a{color: var(--accent-primary);text-decoration:underline}
    .sats{color: var(--accent-primary); font-weight:700}
  `;
  document.head.appendChild(style);

  const list = el('div', { class: 'zap-list' });
  mountEl.appendChild(list);
  list.appendChild(el('div', { class: 'muted', text: 'Loading zaps…' }));

  let authorHex = null;
  try { authorHex = npubToHex(DEFAULT_NPUB); } catch(e) {
    list.textContent = 'Invalid hardcoded npub';
    return;
  }
  let fixedRecipientHex = null;
  try { fixedRecipientHex = npubToHex(HARD_RECIPIENT_NPUB); } catch(_) { fixedRecipientHex = null; }

  const ws = new WebSocket(FIXED_RELAY);
  let opened = false;
  let subId = 'zaps_' + Math.random().toString(36).slice(2,8);
  const events = [];
  const profiles = {}; // pubkey hex -> {name, picture}
  let wantProfiles = new Set();

  ws.onopen = () => {
    opened = true;
    const req = ["REQ", subId, { kinds: [9735], authors: [authorHex], limit: 50 }];
    ws.send(JSON.stringify(req));
  };

  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (!Array.isArray(data)) return;
      const [type, id, payload] = data;
      if (type === 'EVENT' && id === subId && payload && payload.kind === 9735) {
        events.push(payload);
        const r = fixedRecipientHex || getRecipient(payload); if (r) wantProfiles.add(r);
        wantProfiles.add(payload.pubkey);
      } else if (type === 'EOSE' && id === subId) {
        if (wantProfiles.size > 0) requestProfiles(Array.from(wantProfiles));
        else render();
      } else if (type === 'EVENT' && id && id.startsWith('prof_') && payload && payload.kind === 0) {
        try {
          const c = JSON.parse(payload.content || '{}');
          const name = c.display_name || c.name || null;
          const picture = c.picture || null;
          profiles[payload.pubkey] = { name, picture };
        } catch {}
      } else if (type === 'EOSE' && id && id.startsWith('prof_')) {
        render();
      }
    } catch {}
  };

  ws.onerror = () => {
    list.textContent = 'Unable to load donations.';
  };

  function parseAmountSats(ev){
    // Prefer 'amount' tag (msats); fallback 0
    const t = ev.tags.find(t=>t[0]==='amount');
    const msats = t ? parseInt(t[1]||'0', 10) : 0;
    if (Number.isFinite(msats) && msats > 0) return Math.round(msats/1000);
    // Fallback: derive from bolt11 tag if present
    const b = ev.tags.find(t=>t[0]==='bolt11');
    if (b && typeof b[1] === 'string') {
      const s = b[1].toLowerCase();
      const m = s.match(/^lnbc(\d+)([munp])?/);
      if (m) {
        const amt = parseInt(m[1], 10);
        const unit = m[2] || '';
        let sats = 0;
        // No suffix means BTC
        if (!unit) sats = Math.round(amt * 1e8);
        else if (unit === 'm') sats = Math.round(amt * 1e5);
        else if (unit === 'u') sats = Math.round(amt * 1e2);
        else if (unit === 'n') sats = Math.round(amt * 1e-1);
        else if (unit === 'p') sats = Math.round(amt * 1e-4);
        if (Number.isFinite(sats) && sats > 0) return sats;
      }
    }
    return 0;
  }
  function getRecipient(ev){
    const p = ev.tags.find(t=>t[0]==='p');
    return p ? p[1] : undefined;
  }

  function requestProfiles(pubkeys){
    try {
      const id = 'prof_' + Math.random().toString(36).slice(2,8);
      const req = ["REQ", id, { kinds: [0], authors: pubkeys, limit: 100 }];
      ws.send(JSON.stringify(req));
    } catch {}
  }

  function displayName(pk){
    const p = profiles[pk];
    return (p && p.name) ? p.name : short(pk);
  }
  function avatarUrl(pk){
    const p = profiles[pk];
    return (p && p.picture) ? p.picture : `https://robohash.org/${pk}.png`;
  }

  function render(){
    list.innerHTML = '';
    if (events.length === 0) {
      list.appendChild(el('div', { class:'muted', text: 'No zaps found for this sender on the selected relay.' }));
      return;
    }
    // newest first
    events.sort((a,b)=>b.created_at - a.created_at);
    for (const ev of events) {
      const sats = parseAmountSats(ev);
      const sender = ev.pubkey;
      const recipient = fixedRecipientHex || getRecipient(ev);
      const row = el('div', { class:'zap' }, [
        el('div', { class:'row' }, [
          el('div', { class:'avatar' }, [ el('img', { src: avatarUrl(recipient || sender), alt: '' }) ]),
          el('div', { class:'who' }, [
            el('div', { class:'line' }, [
              el('strong', { text: displayName(sender) }), ' zapped ',
              el('strong', { text: recipient?displayName(recipient):'unknown' }), ' for ',
              el('span', { class:'sats', text: `${sats} sats` })
            ]),
            el('div', { class:'muted' }, [
              el('a', { href:`https://njump.me/e/${ev.id}`, target:'_blank', rel:'noreferrer', text:'View on njump' }),
              ' · ', new Date(ev.created_at*1000).toLocaleString()
            ])
          ])
        ])
      ]);
      list.appendChild(row);
    }
  }
})();
