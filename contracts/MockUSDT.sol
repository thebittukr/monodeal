// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * MockUSDT — Simple ERC-20 token for Amoy testnet.
 * Mints 1,000,000 USDT to deployer on creation.
 * Anyone can call faucet() to get 1000 USDT for testing.
 * 6 decimals (same as real USDT on Polygon).
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    uint8 private constant _decimals = 6;
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**6; // 1000 USDT
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10**6; // 1M USDT

    mapping(address => uint256) public lastFaucet;

    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /// Anyone can call this to get 1000 test USDT (once per hour)
    function faucet() external {
        require(block.timestamp - lastFaucet[msg.sender] >= 1 hours, "Wait 1 hour between faucet calls");
        lastFaucet[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
