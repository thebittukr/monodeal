/**
 * After deploying MockUSDT on Remix, run this to:
 * 1. Verify the contract works
 * 2. Print the config update needed
 *
 * Usage: node scripts/setup-testnet.mjs <MOCK_USDT_ADDRESS>
 */

import { ethers } from "ethers";

const AMOY_RPC = "https://rpc-amoy.polygon.technology";
const address = process.argv[2];

if (!address) {
  console.error("\n  Usage: node scripts/setup-testnet.mjs <MOCK_USDT_ADDRESS>\n");
  console.error("  Example: node scripts/setup-testnet.mjs 0x1234...abcd\n");
  process.exit(1);
}

const ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

async function main() {
  console.log("\n  Verifying MockUSDT contract on Amoy...\n");

  const provider = new ethers.JsonRpcProvider(AMOY_RPC);
  const contract = new ethers.Contract(address, ABI, provider);

  try {
    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    const supply = await contract.totalSupply();

    console.log(`  ✅ Contract verified!`);
    console.log(`     Name: ${name}`);
    console.log(`     Symbol: ${symbol}`);
    console.log(`     Decimals: ${decimals}`);
    console.log(`     Total Supply: ${ethers.formatUnits(supply, decimals)}`);
    console.log(`     Address: ${address}`);
    console.log(`     Explorer: https://amoy.polygonscan.com/address/${address}\n`);

    console.log(`  📋 Update lib/wallet/polygon.ts:\n`);
    console.log(`     Find this line in CHAINS.amoy:`);
    console.log(`       usdt: "",`);
    console.log(`     Replace with:`);
    console.log(`       usdt: "${address}",\n`);

    console.log(`  📋 Railway env vars:\n`);
    console.log(`     MOCK_WALLET=false`);
    console.log(`     NEXT_PUBLIC_CHAIN=amoy\n`);

    console.log(`  📋 Test the flow:\n`);
    console.log(`     1. Open your app → Wallet → copy your deposit address`);
    console.log(`     2. In MetaMask, import the MockUSDT token (${address})`);
    console.log(`     3. Call faucet() on the contract to get 1000 test USDT`);
    console.log(`        (Use Remix → "faucet" button, or Polygonscan Write Contract)`);
    console.log(`     4. Send some USDT from MetaMask to your deposit address`);
    console.log(`     5. Click "Check for Deposit" in the app → credits appear!\n`);
  } catch (err) {
    console.error(`  ❌ Failed to verify contract at ${address}`);
    console.error(`     Error: ${err.message}`);
    console.error(`     Make sure the address is correct and on Amoy testnet.\n`);
  }
}

main().catch(console.error);
