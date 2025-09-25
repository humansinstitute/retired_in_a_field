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
    initials: 'P21'
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

function renderPlayerSummary(player) {
  const el = document.getElementById('playerSummary');
  if (!el) return;
  const initials = player.initials || 'P21';
  const score = Number(player.score || 0);
  const games = Number(player.games_played || 0);
  el.innerHTML = `
    <div>Player: ${initials}</div>
    <div>Score: ${score} Sats</div>
    <div>Games Played: ${games}</div>
  `;
}

async function initNostrSession() {
  try {
    const player = await ensurePlayer();
    renderKeys(player);
    renderPlayerSummary(player);
  } catch (err) {
    const container = document.getElementById('nostrKeys');
    if (container) container.textContent = 'Failed to initialize Nostr session.';
  }
}

// Expose a tiny API for the rest of the game to use
window.PlayerStore = PlayerStore;
window.getPlayer = () => PlayerStore.get();
window.updatePlayer = patch => PlayerStore.update(patch);
window.renderPlayerSummary = () => {
  const p = PlayerStore.get();
  if (p) renderPlayerSummary(p);
};

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNostrSession);
} else {
  initNostrSession();
}
