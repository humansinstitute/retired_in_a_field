// Generates or loads a Nostr-backed Player object and displays keys.
// Persistence: sessionStorage (clears when tab closes). This supports
// multiple games in one session as a known ephemeral npub.

const PLAYER_STORAGE_KEY = 'retired.player.v1';

const PlayerStore = {
  get() {
    try {
      const raw = sessionStorage.getItem(PLAYER_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  },
  set(player) {
    try {
      sessionStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player));
    } catch (_) {}
  },
  update(patch) {
    const current = this.get() || {};
    const updated = { ...current, ...patch };
    this.set(updated);
    return updated;
  }
};

function bytesToHex(buf) {
  return Array.from(buf)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function ensurePlayer() {
  let player = PlayerStore.get();
  const needsRegeneration = player && (
    !player.privkey || !player.pubkey || !player.npub || !player.nsec ||
    (typeof player.nsec === 'string' && player.nsec.startsWith('('))
  );
  if (needsRegeneration) {
    try { sessionStorage.removeItem(PLAYER_STORAGE_KEY); } catch (_) {}
    player = null;
  }
  if (player) return player;

  const { generateSecretKey, getPublicKey, nip19 } = await import(
    'https://esm.sh/nostr-tools@2?bundle'
  );

  const sk = generateSecretKey(); // Uint8Array
  const pkHex = getPublicKey(sk); // hex string
  const nsec = nip19.nsecEncode(sk);
  const npub = nip19.npubEncode(pkHex);

  player = {
    npub,
    pubkey: pkHex,
    nsec,
    privkey: bytesToHex(sk),
    score: 0,
    games_played: 0,
    initials: null,
    last_pledge: 0,
    auth_mode: 'ephemeral'
  };
  PlayerStore.set(player);
  return player;
}

function renderKeys(player) {
  const container = document.getElementById('nostrKeys');
  if (!container) return;
  container.innerHTML = '';

  const title = document.createElement('div');
  title.style.marginBottom = '6px';
  title.style.color = 'var(--text-tertiary)';
  title.textContent = 'Session Nostr Identity:';

  const npubEl = document.createElement('div');
  npubEl.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  npubEl.style.padding = '6px 8px';
  npubEl.style.border = '1px solid var(--border-primary)';
  npubEl.style.borderRadius = '6px';
  npubEl.style.background = 'var(--inline-code-bg)';
  npubEl.style.color = 'var(--text-primary)';
  npubEl.style.marginBottom = '6px';
  npubEl.style.whiteSpace = 'pre-wrap';
  const linked = player.linked_npub ? `\nlinked npub: ${player.linked_npub}` : '';
  npubEl.textContent = `session npub: ${player.npub}${linked}`;

  const nsecEl = document.createElement('div');
  nsecEl.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  nsecEl.style.padding = '6px 8px';
  nsecEl.style.border = '1px solid var(--border-primary)';
  nsecEl.style.borderRadius = '6px';
  nsecEl.style.background = 'var(--inline-code-bg)';
  nsecEl.style.color = 'var(--text-primary)';
  nsecEl.style.opacity = '0.9';
  nsecEl.textContent = `nsec: ${player.nsec}`;

  const note = document.createElement('div');
  note.style.marginTop = '6px';
  note.style.fontSize = '0.8rem';
  note.style.color = 'var(--text-muted)';
  note.textContent = player.linked_npub
    ? 'Session key signs MCP traffic. Linked npub is used for leaderboard identity.'
    : 'Stored in session only; closes when tab is closed.';

  container.appendChild(title);
  container.appendChild(npubEl);
  container.appendChild(nsecEl);
  container.appendChild(note);
}

// renderPlayerSummary is defined later with stricter visibility rules

async function initNostrSession() {
  try {
    const player = await ensurePlayer();
    setupKeysModal(player);
    renderPlayerSummary(player);
    // Signal that the player is ready for other modules
    try {
      window.playerReady = true;
      if (!window.whenPlayerReadyResolve) {
        window.whenPlayerReady = new Promise(resolve => (window.whenPlayerReadyResolve = resolve));
      }
      window.whenPlayerReadyResolve(player);
      const evt = new CustomEvent('player-ready', { detail: { player } });
      window.dispatchEvent(evt);
    } catch (_) {}
  } catch (err) {
    const container = document.getElementById('nostrKeys');
    if (container) container.textContent = 'Failed to initialize Nostr session.';
  }
}

// Expose a tiny API for the rest of the game to use
window.PlayerStore = PlayerStore;
window.getPlayer = () => PlayerStore.get();
window.updatePlayer = patch => PlayerStore.update(patch);
// Stats should only come from Context VM; delegate to fetch when asked to render
window.renderPlayerSummary = () => {
  try {
    if (window.fetchPlayerStatsWithPlayerKey) {
      window.fetchPlayerStatsWithPlayerKey();
      return;
    }
  } catch (_) {}
  // Fallback: clear stats area if server fetch unavailable
  try {
    const el = document.getElementById('statsModalContent');
    if (el) el.innerHTML = '';
  } catch (_) {}
};

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNostrSession);
} else {
  initNostrSession();
}

// New: keys modal and updated summary rendering
function setupKeysModal(player) {
  const modal = document.getElementById('keysModal');
  const closeBtn = document.getElementById('keysModalClose');
  const npubEl = document.getElementById('keysModalNpub');
  const nsecEl = document.getElementById('keysModalNsec');
  const toggleBtn = document.getElementById('keysModalToggle');
  if (!modal || !closeBtn || !npubEl || !nsecEl || !toggleBtn) return;

  let revealed = false;
  function maskedNsecText(nsec) {
    return 'nsec: ' + '•'.repeat(Math.max(16, String(nsec).length));
  }

  function render() {
    const p = window.getPlayer ? (window.getPlayer() || player) : player;
    const linked = p.linked_npub ? `\nlinked npub: ${p.linked_npub}` : '';
    npubEl.style.whiteSpace = 'pre-wrap';
    npubEl.textContent = `session npub: ${p.npub}${linked}`;

    const hasNsec = !!p.nsec;
    if (hasNsec) {
      nsecEl.textContent = revealed ? `nsec: ${p.nsec}` : maskedNsecText(p.nsec);
      toggleBtn.style.display = '';
      toggleBtn.textContent = revealed ? '🙈' : '👁';
      toggleBtn.setAttribute('aria-label', revealed ? 'Hide private key' : 'Reveal private key');
    } else {
      nsecEl.textContent = 'Session key unavailable; refresh the tab to generate a new one.';
      toggleBtn.style.display = 'none';
    }
  }

  render();

  // Expose a global opener used by the options menu
  window.openKeysModal = () => {
    render();
    modal.style.display = 'flex';
  };
  closeBtn.onclick = () => {
    modal.style.display = 'none';
  };
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
  toggleBtn.onclick = () => {
    revealed = !revealed;
    render();
  };
}

// NIP-07 login: overwrite to use extension signer
window.loginWithNip07 = async () => {
  try {
    if (typeof window === 'undefined' || !window.nostr || typeof window.nostr.getPublicKey !== 'function') {
      alert('No Nostr extension detected (NIP-07). Please install a Nostr browser extension.');
      return false;
    }
    const pubkeyHex = await window.nostr.getPublicKey();
    const { nip19 } = await import('https://esm.sh/nostr-tools@2?bundle');
    const npub = nip19.npubEncode(pubkeyHex);

    // Update player store to record extension identity while keeping session keys
    const updated = PlayerStore.update({
      auth_mode: 'nip07',
      linked_pubkey: pubkeyHex,
      linked_npub: npub,
      linked_at: Date.now()
    });

    // Re-render keys modal and stats
    try { renderKeys(updated); } catch (_) {}
    try { renderPlayerSummary(updated); } catch (_) {}
    try { if (window.fetchPlayerStatsWithPlayerKey) window.fetchPlayerStatsWithPlayerKey(); } catch (_) {}
    try { if (window.fetchLeaderboardWithPlayerKey) window.fetchLeaderboardWithPlayerKey(); } catch (_) {}
    try { if (window.UI && typeof window.UI.updateNostrLoginIndicator === 'function') window.UI.updateNostrLoginIndicator(); } catch (_) {}
    return true;
  } catch (e) {
    console.error('NIP-07 login failed:', e);
    return false;
  }
};

// Override: Only show stats if initials exist and at least one game played
function renderPlayerSummary(player) {
  const el = document.getElementById('statsModalContent');
  if (!el) return;
  const hasStats = !!player.initials && Number(player.games_played || 0) > 0;
  if (!hasStats) {
    el.innerHTML = '';
    return;
  }
  const initials = player.initials;
  const score = Number(player.score || 0);
  const points = Number((player.points || (window._serverPlayer && window._serverPlayer.points) || 0));
  const maxSpeed = Number(
    (typeof player.maxCowSpeed !== 'undefined') ? player.maxCowSpeed :
    (window._serverPlayer && (typeof window._serverPlayer.maxCowSpeed !== 'undefined' ? window._serverPlayer.maxCowSpeed : window._serverPlayer.max_speed)) || 0
  );
  const games = Number(player.games_played || 0);
  el.innerHTML = `
    <div><strong>Player:</strong> ${initials}</div>
    <div><strong>Sats Lost:</strong> ${score} Sats</div>
    <div><strong>Points:</strong> ${points}</div>
    <div><strong>Max Cow Speed:</strong> ${maxSpeed.toFixed(2)}</div>
    <div><strong>Games Played:</strong> ${games}</div>
  `;
}
