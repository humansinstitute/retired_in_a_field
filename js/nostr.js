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
    last_pledge: 0
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
  npubEl.textContent = `npub: ${player.npub}`;

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
  note.textContent = 'Stored in session only; closes when tab is closed.';

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
    npubEl.textContent = `npub: ${player.npub}`;
    nsecEl.textContent = revealed ? `nsec: ${player.nsec}` : maskedNsecText(player.nsec);
    toggleBtn.textContent = revealed ? '🙈' : '👁';
    toggleBtn.setAttribute('aria-label', revealed ? 'Hide private key' : 'Reveal private key');
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
  const games = Number(player.games_played || 0);
  el.innerHTML = `
    <div><strong>Player:</strong> ${initials}</div>
    <div><strong>Score:</strong> ${score} Sats</div>
    <div><strong>Games Played:</strong> ${games}</div>
  `;
}
