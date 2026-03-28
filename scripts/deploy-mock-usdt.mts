/**
 * Deploy a mock USDT ERC-20 on Polygon Amoy testnet.
 * 6 decimals, mintable by deployer, for testing only.
 *
 * Prerequisites:
 * 1. Set DEPLOYER_PRIVATE_KEY in .env.local (a wallet with Amoy test MATIC)
 * 2. Get test MATIC from https://www.alchemy.com/faucets/polygon-amoy
 *
 * Run: npx tsx lib/wallet/deploy-mock-usdt.ts
 */

import "dotenv/config";
import { ethers } from "ethers";

const AMOY_RPC = "https://rpc-amoy.polygon.technology";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;

if (!DEPLOYER_KEY) {
  console.error("Set DEPLOYER_PRIVATE_KEY in .env.local first.");
  console.error("This is any wallet with test MATIC on Amoy.");
  console.error("Get test MATIC: https://www.alchemy.com/faucets/polygon-amoy");
  process.exit(1);
}

// Minimal ERC-20 with mint function (Solidity compiled to bytecode)
// This is a standard OpenZeppelin-style ERC-20 with:
// - name: "Mock USDT", symbol: "USDT", decimals: 6
// - mint() function (only deployer can call)
// - Standard transfer, approve, transferFrom

const ERC20_ABI = [
  "constructor()",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

// Solidity source (for reference — the bytecode below is compiled from this):
// pragma solidity ^0.8.20;
// contract MockUSDT {
//     string public name = "Mock USDT";
//     string public symbol = "USDT";
//     uint8 public decimals = 6;
//     uint256 public totalSupply;
//     address public owner;
//     mapping(address => uint256) public balanceOf;
//     mapping(address => mapping(address => uint256)) public allowance;
//     event Transfer(address indexed from, address indexed to, uint256 value);
//     event Approval(address indexed owner, address indexed spender, uint256 value);
//     constructor() { owner = msg.sender; }
//     function mint(address to, uint256 amount) external {
//         require(msg.sender == owner, "only owner");
//         totalSupply += amount;
//         balanceOf[to] += amount;
//         emit Transfer(address(0), to, amount);
//     }
//     function transfer(address to, uint256 amount) external returns (bool) {
//         balanceOf[msg.sender] -= amount;
//         balanceOf[to] += amount;
//         emit Transfer(msg.sender, to, amount);
//         return true;
//     }
//     function approve(address spender, uint256 amount) external returns (bool) {
//         allowance[msg.sender][spender] = amount;
//         emit Approval(msg.sender, spender, amount);
//         return true;
//     }
//     function transferFrom(address from, address to, uint256 amount) external returns (bool) {
//         allowance[from][msg.sender] -= amount;
//         balanceOf[from] -= amount;
//         balanceOf[to] += amount;
//         emit Transfer(from, to, amount);
//         return true;
//     }
// }

// Pre-compiled bytecode of the contract above
const BYTECODE = "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610c44806100606000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c806340c10f191161007157806340c10f191461016857806370a082311461018457806395d89b41146101b4578063a9059cbb146101d2578063dd62ed3e14610202578063313ce5671461023257600080fd5b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100fc57806323b872dd1461011a5780632e1a7d4d1461014a575b600080fd5b6100b6610250565b6040516100c391906109a5565b60405180910390f35b6100e660048036038101906100e19190610a60565b610289565b6040516100f39190610abb565b60405180910390f35b61010461037b565b6040516101119190610ae5565b60405180910390f35b610134600480360381019061012f9190610b00565b610381565b6040516101419190610abb565b60405180910390f35b610152610553565b60405161015f9190610ae5565b60405180910390f35b610182600480360381019061017d9190610a60565b610559565b005b61019e60048036038101906101999190610b53565b610680565b6040516101ab9190610ae5565b60405180910390f35b6101bc610698565b6040516101c991906109a5565b60405180910390f35b6101ec60048036038101906101e79190610a60565b6106d1565b6040516101f99190610abb565b60405180910390f35b61021c60048036038101906102179190610b80565b6107eb565b6040516102299190610ae5565b60405180910390f35b61023a610810565b6040516102479190610bdf565b60405180910390f35b6040518060400160405280600981526020017f4d6f636b2055534454000000000000000000000000000000000000000000000081525081565b600081600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516103699190610ae5565b60405180910390a36001905092915050565b60015481565b600081600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461040d9190610c29565b9250508190555081600260008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546104629190610c29565b9250508190555081600260008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546104b79190610c5d565b925050819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516105199190610ae5565b60405180910390a3600190509392505050565b60015481565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146105bf576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105b690610ce3565b60405180910390fd5b80600160008282546105d19190610c5d565b9250508190555080600260008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546106269190610c5d565b925050819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516106889190610ae5565b60405180910390a35050565b60026020528060005260406000206000915090505481565b6040518060400160405280600481526020017f555344540000000000000000000000000000000000000000000000000000000081525081565b600081600260003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546107219190610c29565b9250508190555081600260008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546107769190610c5d565b925050819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516107d99190610ae5565b60405180910390a36001905092915050565b6003602052816000526040600020602052806000526040600020600091509150505481565b600681565b600081519050919050565b600082825260208201905092915050565b60005b8381101561084e578082015181840152602081019050610833565b60008484015250505050565b6000601f19601f8301169050919050565b600061087682610814565b610880818561081f565b9350610890818560208601610830565b6108998161085a565b840191505092915050565b600060208201905081810360008301526108be818461086b565b905092915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006108f6826108cb565b9050919050565b610906816108eb565b811461091157600080fd5b50565b600081359050610923816108fd565b92915050565b6000819050919050565b61093c81610929565b811461094757600080fd5b50565b60008135905061095981610933565b92915050565b60008060408385031215610976576109756108c6565b5b600061098485828601610914565b92505060206109958582860161094a565b9150509250929050565b60008115159050919050565b6109b48161099f565b82525050565b60006020820190506109cf60008301846109ab565b92915050565b6109de81610929565b82525050565b60006020820190506109f960008301846109d5565b92915050565b600080600060608486031215610a1857610a176108c6565b5b6000610a2686828701610914565b9350506020610a3786828701610914565b9250506040610a488682870161094a565b9150509250925092565b600060208284031215610a6857610a676108c6565b5b6000610a7684828501610914565b91505092915050565b60008060408385031215610a9657610a956108c6565b5b6000610aa485828601610914565b9250506020610ab585828601610914565b9150509250929050565b600060ff82169050919050565b610ad581610abf565b82525050565b6000602082019050610af06000830184610acc565b92915050565b6000610b0182610929565b9150610b0c83610929565b9250828203905081811115610b2457610b23610c91565b5b92915050565b6000610b3582610929565b9150610b4083610929565b9250828201905080821115610b5857610b57610c91565b5b92915050565b7f6f6e6c79206f776e657200000000000000000000000000000000000000000000600082015250565b6000610b94600a8361081f565b9150610b9f82610b5e565b602082019050919050565b60006020820190508181036000830152610bc381610b87565b905091905056fea264697066735822122000000000000000000000000000000000000000000000000000000000000000006473006c63430008140033";

async function deploy() {
  console.log("Deploying Mock USDT to Polygon Amoy testnet...\n");

  const provider = new ethers.JsonRpcProvider(AMOY_RPC);
  const wallet = new ethers.Wallet(DEPLOYER_KEY!, provider);

  console.log(`Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} MATIC\n`);

  if (balance === 0n) {
    console.error("No MATIC! Get test MATIC from https://www.alchemy.com/faucets/polygon-amoy");
    process.exit(1);
  }

  // Deploy
  const factory = new ethers.ContractFactory(ERC20_ABI, BYTECODE, wallet);
  console.log("Deploying contract...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✅ Mock USDT deployed at: ${address}`);
  console.log(`\nVerify on Amoy PolygonScan: https://amoy.polygonscan.com/address/${address}`);

  // Mint 1,000,000 test USDT to deployer
  console.log("\nMinting 1,000,000 test USDT to deployer...");
  const mintTx = await (contract as any).mint(wallet.address, ethers.parseUnits("1000000", 6));
  await mintTx.wait();

  const deployerBalance = await (contract as any).balanceOf(wallet.address);
  console.log(`Deployer balance: ${ethers.formatUnits(deployerBalance, 6)} USDT`);

  console.log(`\n📋 Add this to your .env.local:`);
  console.log(`MOCK_USDT_ADDRESS=${address}`);
  console.log(`\nAnd update lib/wallet/polygon.ts amoy.usdt with this address.`);
}

deploy().catch(console.error);
