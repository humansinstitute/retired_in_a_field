import { Client } from "@modelcontextprotocol/sdk/client";
import { ApplesauceRelayPool, NostrClientTransport } from "@contextvm/sdk";
import { PrivateKeySigner } from "@contextvm/sdk";

// --- Configuration ---
// IMPORTANT: Replace with the server's public key from the server output
const SERVER_PUBKEY = "81844e7366dc32a566adf54547aa80ceb20bbfdc6c62c4f9b7a0e8f2f2551cbc";

// IMPORTANT: Player private key (hex). Prefer runtime player key when available.
// If window.getPlayer exists (from js/nostr.js), use that session key.
let CLIENT_PRIVATE_KEY_HEX: string = (typeof window !== 'undefined'
  && (window as any).getPlayer
  && (window as any).getPlayer()?.privkey) || "THIS SHOULD BE REPLACED BY THE PLAYERS PRIVATE KEY";
const RELAYS = [
  "wss://relay.contextvm.org",
  "wss://cvm.otherstuff.ai",
];

// --- Main Client Logic ---
async function main() {
  // 1. Setup Signer and Relay Pool
  const signer = new PrivateKeySigner(CLIENT_PRIVATE_KEY_HEX);
  const relayPool = new ApplesauceRelayPool(RELAYS);

  console.log("Connecting to relays...");

  // 2. Configure the Nostr Client Transport
  const clientTransport = new NostrClientTransport({
    signer,
    relayHandler: relayPool,
    serverPubkey: SERVER_PUBKEY,
  });

  // 3. Create and connect the MCP Client
  const mcpClient = new Client({
    name: "retired-fe-client",
    version: "1.0.0",
  });
  await mcpClient.connect(clientTransport);

  console.log("Connected to server!");

  // 4. List the available tools
  console.log("\nListing available tools...");
  const tools = await mcpClient.listTools();
  console.log("Tools:", tools);

  // 5. Call the "check_leaderboard" tool
  console.log('\nCalling the "check_leaderboard" tool...');
  const leaderboardResult = await mcpClient.callTool({
    name: "check_leaderboard",
    arguments: {},
  });
  console.log("Leaderboard result:", leaderboardResult);

  // 6. Close the connection
  await mcpClient.close();
  console.log("\nConnection closed.");
}

// If used in a browser, optionally expose and/or auto-run on DOM load
if (typeof window !== 'undefined') {
  (window as any).runCvmClient = main;
}

// Only auto-run in non-browser (e.g., bun/node) environments
if (typeof window === 'undefined') {
  main().catch((error) => {
    console.error("Client failed:", error);
    process.exit(1);
  });
}
