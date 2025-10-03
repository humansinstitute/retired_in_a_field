// Browser MCP over Nostr client that uses the player's private key
// Requires: js/nostr.js to have initialized a session player

const SERVER_PUBKEY = window.CVM_SERVER_PUBKEY || "";
const RELAYS = [
  // "wss://relay.contextvm.org",
  "wss://cvm.otherstuff.ai",
];

async function loadDeps() {
  const [{ Client }, sdk] = await Promise.all([
    import("https://esm.sh/@modelcontextprotocol/sdk@1.17.5/client?bundle"),
    import("https://esm.sh/@contextvm/sdk@0.1.28?bundle"),
  ]);
  const { ApplesauceRelayPool, NostrClientTransport, PrivateKeySigner } = sdk;
  return { Client, ApplesauceRelayPool, NostrClientTransport, PrivateKeySigner };
}

function ensureLeaderboardUI() {
  let container = document.getElementById('leaderboard');
  if (!container) {
    container = document.createElement('div');
    container.id = 'leaderboard';
    // Match preview image container sizing (80%, max-width 400px)
    container.style.width = '80%';
    container.style.maxWidth = '400px';
    container.style.margin = '12px auto 0';
    container.style.padding = '10px';
    container.style.borderTop = '1px solid var(--border-primary)';
    const parent = document.getElementById('setupScreen') || document.body;
    parent.appendChild(container);
  }
  let status = document.getElementById('leaderboardStatus');
  if (!status) {
    status = document.createElement('div');
    status.id = 'leaderboardStatus';
    status.style.display = 'flex';
    status.style.alignItems = 'center';
    status.style.gap = '8px';
    status.style.color = 'var(--text-secondary)';
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    spinner.style.width = '14px';
    spinner.style.height = '14px';
    spinner.style.border = '2px solid var(--border-primary)';
    spinner.style.borderTopColor = 'transparent';
    spinner.style.borderRadius = '50%';
    spinner.style.display = 'inline-block';
    spinner.style.animation = 'spin 0.9s linear infinite';
    const text = document.createElement('span');
    text.textContent = 'Leaderboard loading…';
    status.appendChild(spinner);
    status.appendChild(text);
    container.appendChild(status);
    // add spinner keyframes once
    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);
    }
  }
  let list = document.getElementById('leaderboardList');
  if (!list) {
    list = document.createElement('div');
    list.id = 'leaderboardList';
    list.style.marginTop = '8px';
    container.appendChild(list);
  }
  return { container, status, list };
}

function renderLeaderboard(items) {
  const { status, list } = ensureLeaderboardUI();
  status.style.display = 'none';
  list.innerHTML = '';
  // Title (H2) and tagline
  const title = document.createElement('h2');
  title.textContent = 'Leaderboard!';
  title.style.color = 'var(--accent-primary)';
  title.style.fontSize = '1.25rem';
  title.style.fontWeight = '700';
  title.style.margin = '0 0 4px 0';
  list.appendChild(title);
  const tagline = document.createElement('div');
  tagline.textContent = 'May your name be remembered in the halls of Valhalla';
  tagline.style.color = 'var(--text-secondary)';
  tagline.style.fontSize = '0.95rem';
  tagline.style.marginBottom = '8px';
  list.appendChild(tagline);

  // Player quick stats (from server if available)
  try {
    const sp = window._serverPlayer || null;
    if (sp && (sp.initials || sp.played || sp.score)) {
      const initials = String(sp.initials || '').toUpperCase();
      const games = Number(sp.played || 0);
      const score = Number(sp.score || 0);
      const quick = document.createElement('div');
      quick.id = 'leaderboardPlayerStats';
      quick.style.color = 'var(--text-tertiary)';
      quick.style.fontSize = '0.9rem';
      quick.style.margin = '-2px 0 8px 0';
      quick.textContent = `${initials || '—'} | played: ${games} | score: ${score}`;
      list.appendChild(quick);
    }
  } catch (_) {}

  // Header row
  const header = document.createElement('div');
  header.style.display = 'grid';
  header.style.gridTemplateColumns = '48px 1fr 1fr 1fr 1fr 1fr';
  header.style.gap = '8px';
  header.style.color = 'var(--accent-primary)';
  header.style.fontWeight = '700';
  header.style.margin = '4px 0';
  const hPos = document.createElement('div'); hPos.textContent = 'POS';
  const hInit = document.createElement('div'); hInit.textContent = 'Initials';
  const hNpub = document.createElement('div'); hNpub.textContent = 'Npub';
  const hSats = document.createElement('div'); hSats.textContent = 'Sats Lost';
  const hPoints = document.createElement('div'); hPoints.textContent = 'Points';
  const hMax = document.createElement('div'); hMax.textContent = 'Max Speed';
  header.appendChild(hPos);
  header.appendChild(hInit);
  header.appendChild(hNpub);
  header.appendChild(hSats);
  header.appendChild(hPoints);
  header.appendChild(hMax);
  list.appendChild(header);
  const ul = document.createElement('div');
  ul.style.display = 'grid';
  ul.style.rowGap = '6px';
  items.forEach((it, idx) => {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '48px 1fr 1fr 1fr 1fr 1fr';
    row.style.gap = '8px';
    row.style.alignItems = 'center';
    row.style.background = 'var(--bg-secondary)';
    row.style.border = '1px solid var(--border-primary)';
    row.style.borderRadius = '6px';
    row.style.padding = '6px 8px';

    const pos = document.createElement('div');
    pos.textContent = String(idx + 1);
    pos.style.fontWeight = idx === 0 ? '800' : '700';
    pos.style.textAlign = 'left';

    const init = document.createElement('div');
    init.textContent = String((it.initials || it.name || '')).toUpperCase() || '—';
    init.style.fontWeight = idx === 0 ? '800' : '700';

    const npub = document.createElement('div');
    const np = typeof it.npub === 'string' && it.npub.length > 0 ? it.npub : '';
    const npSuffix = np ? np.slice(-6) : '';
    npub.textContent = npSuffix ? ('...' + npSuffix) : '';
    npub.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
    npub.style.opacity = '0.85';

    // Sats Lost column (original score)
    const satsEl = document.createElement('div');
    const satsVal = Number(
      (typeof it.satsLost !== 'undefined') ? it.satsLost :
      (typeof it.score !== 'undefined') ? it.score :
      (typeof it.sats !== 'undefined') ? it.sats : 0
    );
    satsEl.textContent = `${satsVal} sats`;
    satsEl.style.fontVariantNumeric = 'tabular-nums';
    satsEl.style.textAlign = 'right';

    const points = document.createElement('div');
    const pointsVal = Number(
      (typeof it.points !== 'undefined') ? it.points : 0
    );
    points.textContent = `${pointsVal}`;
    points.style.fontVariantNumeric = 'tabular-nums';
    points.style.textAlign = 'right';

    const maxSpeed = document.createElement('div');
    const maxVal = Number(
      (typeof it.maxCowSpeed !== 'undefined') ? it.maxCowSpeed :
      (typeof it.max_speed !== 'undefined') ? it.max_speed : 0
    );
    maxSpeed.textContent = `${maxVal.toFixed(2)}`;
    maxSpeed.style.fontVariantNumeric = 'tabular-nums';
    maxSpeed.style.textAlign = 'right';

    row.appendChild(pos);
    row.appendChild(init);
    row.appendChild(npub);
    row.appendChild(satsEl);
    row.appendChild(points);
    row.appendChild(maxSpeed);
    ul.appendChild(row);
  });
  list.appendChild(ul);
}

function renderPlayerSummaryFromServer(data) {
  try {
    const el = document.getElementById('statsModalContent');
    if (!el) return;
    // Cache latest server player for other UI (e.g., quick stats)
    try { window._serverPlayer = data; } catch (_) {}
    const initials = (data && data.initials) ? String(data.initials) : '';
    const score = Number(data && data.score ? data.score : 0);
    const points = Number(data && data.points ? data.points : 0);
    const maxSpeed = Number(
      (typeof data.maxCowSpeed !== 'undefined') ? data.maxCowSpeed :
      (typeof data.max_speed !== 'undefined') ? data.max_speed : 0
    );
    const played = Number(data && data.played ? data.played : 0);
    if (!initials) {
      // If no initials on server, keep existing UI (might be empty)
      return;
    }
    el.innerHTML = `
      <div><strong>Player:</strong> ${initials}</div>
      <div><strong>Sats Lost:</strong> ${score} Sats</div>
      <div><strong>Points:</strong> ${points}</div>
      <div><strong>Max Cow Speed:</strong> ${maxSpeed.toFixed(2)}</div>
      <div><strong>Games Played:</strong> ${played}</div>
    `;
  } catch (_) {}
}

async function fetchPlayerStatsWithPlayerKey() {
  try {
    // Wait for player readiness
    let player = window.getPlayer ? window.getPlayer() : null;
    if (!player || !player.privkey) {
      if (window.whenPlayerReady) {
        player = await window.whenPlayerReady;
      } else {
        await new Promise(resolve => window.addEventListener('player-ready', () => resolve(), { once: true }));
        player = window.getPlayer ? window.getPlayer() : null;
      }
    }
    const priv = player?.privkey;
    const npub = player?.npub;
    if (!npub) return;

    if (!SERVER_PUBKEY) {
      console.warn("CVM server pubkey not configured (window.CVM_SERVER_PUBKEY). Skipping player stats fetch.");
      return;
    }

    const { Client, ApplesauceRelayPool, NostrClientTransport, PrivateKeySigner } = await loadDeps();
    const signer = new PrivateKeySigner(priv);
    const relayPool = new ApplesauceRelayPool(RELAYS);
    const clientTransport = new NostrClientTransport({ signer, relayHandler: relayPool, serverPubkey: SERVER_PUBKEY });

    const mcpClient = new Client({ name: "retired-fe-client", version: "1.0.0" });
    await mcpClient.connect(clientTransport);

    const result = await mcpClient.callTool({ name: "get_player", arguments: { npub } });
    // Try to normalize result; some MCP bridges return { content: [{ text: "...json..." }] }
    let data = null;
    try {
      const text = result?.content?.[0]?.text;
      if (typeof text === 'string') data = JSON.parse(text);
    } catch (_) {}
    if (!data && result && (result.npub || result.error)) {
      data = result;
    }
    if (data && !data.error) {
      renderPlayerSummaryFromServer(data);
    } else if (data && data.error) {
      console.warn('get_player error:', data.error, 'npub:', data.npub);
    }

    await mcpClient.close();
  } catch (err) {
    console.error("Failed to fetch player stats via MCP:", err);
  }
}

async function fetchLeaderboardWithPlayerKey() {
  try {
    // Ensure UI and show spinner
    ensureLeaderboardUI();

    // Wait for player readiness if not ready yet
    let player = window.getPlayer ? window.getPlayer() : null;
    if (!player || !player.privkey) {
      if (window.whenPlayerReady) {
        player = await window.whenPlayerReady;
      } else {
        await new Promise(resolve => window.addEventListener('player-ready', () => resolve(), { once: true }));
        player = window.getPlayer ? window.getPlayer() : null;
      }
    }
    const priv = player?.privkey;

    if (!SERVER_PUBKEY) {
      console.warn("CVM server pubkey not configured (window.CVM_SERVER_PUBKEY). Skipping leaderboard fetch.");
      return;
    }

    const { Client, ApplesauceRelayPool, NostrClientTransport, PrivateKeySigner } = await loadDeps();

    const signer = new PrivateKeySigner(priv);
    const relayPool = new ApplesauceRelayPool(RELAYS);

    const clientTransport = new NostrClientTransport({
      signer,
      relayHandler: relayPool,
      serverPubkey: SERVER_PUBKEY,
    });

    const mcpClient = new Client({ name: "retired-fe-client", version: "1.0.0" });
    await mcpClient.connect(clientTransport);

    const leaderboardResult = await mcpClient.callTool({ name: "check_leaderboard", arguments: {} });
    console.log("Leaderboard received:", leaderboardResult);
    // Extract JSON array from MCP result (support multiple shapes)
    let items = [];
    try {
      const part = Array.isArray(leaderboardResult?.content) ? leaderboardResult.content[0] : null;
      const text = part && typeof part.text === 'string' ? part.text : null;
      if (text) {
        items = JSON.parse(text);
      } else if (part && Array.isArray(part.json)) {
        items = part.json;
      } else if (Array.isArray(leaderboardResult?.items)) {
        items = leaderboardResult.items;
      }
    } catch (e) {
      try { console.warn('Failed to parse leaderboard payload', e); } catch (_) {}
    }
  if (Array.isArray(items)) {
      // Sort primarily by sats lost (original score), then by points
      const satsOf = (it) => Number(
        (typeof it.satsLost !== 'undefined') ? it.satsLost :
        (typeof it.score !== 'undefined') ? it.score :
        (typeof it.sats !== 'undefined') ? it.sats : 0
      );
      const pointsOf = (it) => Number((typeof it.points !== 'undefined') ? it.points : 0);
      items.sort((a, b) => {
        const da = satsOf(a), db = satsOf(b);
        if (db !== da) return db - da;
        return pointsOf(b) - pointsOf(a);
      });
      renderLeaderboard(items);
  } else {
      try { console.warn('Leaderboard items missing or invalid'); } catch (_) {}
    }

    await mcpClient.close();
  } catch (err) {
    console.error("Failed to fetch leaderboard via MCP:", err);
  }
}

// Submit a single leaderboard entry via MCP over Nostr
function generateRefId() {
  // RFC4122-ish v4 using crypto if available
  try {
    const buf = new Uint8Array(16);
    (self.crypto || window.crypto).getRandomValues(buf);
    // Per RFC: set version and variant bits
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const hex = [...buf].map(b => b.toString(16).padStart(2, '0'));
    return (
      hex.slice(0, 4).join('') + '-' +
      hex.slice(4, 6).join('') + '-' +
      hex.slice(6, 8).join('') + '-' +
      hex.slice(8, 10).join('') + '-' +
      hex.slice(10, 16).join('')
    );
  } catch (_) {
    // Fallback: not cryptographically strong, but sufficient as a dedupe key
    return 'ref-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
}

async function submitLeaderboardEntry({ npub, initials, satsLost, points, maxCowSpeed, refId }) {
  try {
    if (!SERVER_PUBKEY) {
      console.warn("CVM server pubkey not configured (window.CVM_SERVER_PUBKEY). Skipping leaderboard update.");
      return false;
    }

    // Ensure player is ready to obtain privkey for signing
    let player = window.getPlayer ? window.getPlayer() : null;
    if (!player || !player.privkey) {
      if (window.whenPlayerReady) {
        player = await window.whenPlayerReady;
      } else {
        await new Promise(resolve => window.addEventListener('player-ready', () => resolve(), { once: true }));
        player = window.getPlayer ? window.getPlayer() : null;
      }
    }

    const priv = player?.privkey;
    if (!priv) {
      console.warn("Player private key unavailable; cannot submit leaderboard entry.");
      return false;
    }

    // Validate required args
    if (!npub || !initials || typeof satsLost === 'undefined') {
      console.warn("submitLeaderboardEntry missing required fields", { npub, initials, satsLost });
      return false;
    }
    // Basic shape checks per server spec
    if (typeof initials !== 'string' || initials.length !== 3) {
      console.warn("submitLeaderboardEntry invalid initials (must be 3 chars)", initials);
      return false;
    }

    const { Client, ApplesauceRelayPool, NostrClientTransport, PrivateKeySigner } = await loadDeps();

    const signer = new PrivateKeySigner(priv);
    const relayPool = new ApplesauceRelayPool(RELAYS);
    const clientTransport = new NostrClientTransport({
      signer,
      relayHandler: relayPool,
      serverPubkey: SERVER_PUBKEY,
    });

    const mcpClient = new Client({ name: "retired-fe-client", version: "1.0.0" });
    await mcpClient.connect(clientTransport);

    const args = {
      npub,
      initials,
      satsLost: Number(satsLost),
      points: Number(points || 0),
      maxCowSpeed: Number(maxCowSpeed || 0),
      refId: refId || generateRefId()
    };
    const result = await mcpClient.callTool({ name: "update_leaderboard", arguments: args });
    console.log("Leaderboard update result:", result);

    await mcpClient.close();
    return true;
  } catch (err) {
    console.error("Failed to submit leaderboard entry via MCP:", err);
    return false;
  }
}

// Run after DOM ready to ensure player session exists
function runOnLoad() {
  // Slight defer to allow nostr.js to finish initial session creation
  setTimeout(() => {
    fetchLeaderboardWithPlayerKey();
    fetchPlayerStatsWithPlayerKey();
  }, 0);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runOnLoad);
} else {
  runOnLoad();
}

// Expose for manual retries if needed
window.fetchLeaderboardWithPlayerKey = fetchLeaderboardWithPlayerKey;
window.submitLeaderboardEntry = submitLeaderboardEntry;
window.fetchPlayerStatsWithPlayerKey = fetchPlayerStatsWithPlayerKey;

// Redeem a Cashu token and check access via MCP tool `cashu_access`
// Accepts optional `refId` (generated if omitted) for idempotency/deduping
async function redeemCashuAccess(encodedToken, minAmount = 21, refId) {
  try {
    if (!encodedToken || typeof encodedToken !== 'string') {
      return { decision: 'ACCESS_DENIED', amount: 0, reason: 'encodedToken is required (cashu... string)', mode: 'error' };
    }

    if (!SERVER_PUBKEY) {
      return { decision: 'ACCESS_DENIED', amount: 0, reason: 'CVM server pubkey not configured', mode: 'error' };
    }

    // Wait for player readiness to get signing key
    let player = window.getPlayer ? window.getPlayer() : null;
    if (!player || !player.privkey) {
      if (window.whenPlayerReady) {
        player = await window.whenPlayerReady;
      } else {
        await new Promise(resolve => window.addEventListener('player-ready', () => resolve(), { once: true }));
        player = window.getPlayer ? window.getPlayer() : null;
      }
    }
    const priv = player?.privkey;
    if (!priv) {
      return { decision: 'ACCESS_DENIED', amount: 0, reason: 'player key unavailable', mode: 'error' };
    }

    const { Client, ApplesauceRelayPool, NostrClientTransport, PrivateKeySigner } = await loadDeps();
    const signer = new PrivateKeySigner(priv);
    const relayPool = new ApplesauceRelayPool(RELAYS);
    const clientTransport = new NostrClientTransport({ signer, relayHandler: relayPool, serverPubkey: SERVER_PUBKEY });
    const mcpClient = new Client({ name: 'retired-fe-client', version: '1.0.0' });
    await mcpClient.connect(clientTransport);

    const args = { encodedToken, minAmount: Number(minAmount || 21), refId: refId || generateRefId() };
    const result = await mcpClient.callTool({ name: 'cashu_access', arguments: args });

    await mcpClient.close();

    // Try to normalize response to the declared interface
    let data = null;
    try {
      const text = result?.content?.[0]?.text;
      if (typeof text === 'string') data = JSON.parse(text);
    } catch (_) {}
    if (!data && result && (result.decision || result.reason)) {
      data = result;
    }
    if (!data) {
      return { decision: 'ACCESS_DENIED', amount: 0, reason: 'unexpected empty response', mode: 'error' };
    }
    return data;
  } catch (err) {
    console.error('cashu_access call failed:', err);
    return { decision: 'ACCESS_DENIED', amount: 0, reason: String(err && err.message ? err.message : err), mode: 'error' };
  }
}

window.redeemCashuAccess = redeemCashuAccess;
