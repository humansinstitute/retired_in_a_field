// Browser MCP over Nostr client that uses the player's private key
// Requires: js/nostr.js to have initialized a session player

const SERVER_PUBKEY = "81844e7366dc32a566adf54547aa80ceb20bbfdc6c62c4f9b7a0e8f2f2551cbc";
const RELAYS = [
  "wss://relay.contextvm.org",
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
    container.style.maxWidth = '640px';
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
  const title = document.createElement('div');
  title.textContent = 'Leaderboard';
  title.style.fontWeight = '600';
  title.style.marginBottom = '6px';
  list.appendChild(title);
  const ul = document.createElement('div');
  ul.style.display = 'grid';
  ul.style.rowGap = '6px';
  items.forEach((it, idx) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.background = 'var(--bg-secondary)';
    row.style.border = '1px solid var(--border-primary)';
    row.style.borderRadius = '6px';
    row.style.padding = '6px 8px';
    const left = document.createElement('div');
    left.textContent = `${idx + 1}. ${it.initials}`;
    left.style.fontWeight = idx === 0 ? '700' : '600';
    const right = document.createElement('div');
    right.textContent = `${Number(it.satsLost)} sats`;
    right.style.fontVariantNumeric = 'tabular-nums';
    row.appendChild(left);
    row.appendChild(right);
    ul.appendChild(row);
  });
  list.appendChild(ul);
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
    // Extract JSON array from MCP result
    let items = [];
    try {
      const text = leaderboardResult?.content?.[0]?.text;
      if (typeof text === 'string') {
        items = JSON.parse(text);
      }
    } catch (_) {}
    if (Array.isArray(items)) {
      // Sort highest satsLost first
      items.sort((a, b) => Number(b.satsLost || 0) - Number(a.satsLost || 0));
      renderLeaderboard(items);
    }

    await mcpClient.close();
  } catch (err) {
    console.error("Failed to fetch leaderboard via MCP:", err);
  }
}

// Run after DOM ready to ensure player session exists
function runOnLoad() {
  // Slight defer to allow nostr.js to finish initial session creation
  setTimeout(fetchLeaderboardWithPlayerKey, 0);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runOnLoad);
} else {
  runOnLoad();
}

// Expose for manual retries if needed
window.fetchLeaderboardWithPlayerKey = fetchLeaderboardWithPlayerKey;
