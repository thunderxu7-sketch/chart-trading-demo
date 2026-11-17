// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

// Trade-off: unrestricted minting is useful for repeatable local demos ONLY.
// Deployment on other chains is forbidden. This is neither a market nor an audit.
contract TestToken is ERC20 {
    uint8 private immutable precision;
    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_) {
        require(block.chainid == 31337, 'LOCAL_ONLY'); precision = decimals_;
    }
    function decimals() public view override returns (uint8) { return precision; }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

// Fixed-price test exchange. Not an AMM, oracle, order-book matcher, or production DEX.
contract MockExchange is ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 public immutable base;
    IERC20 public immutable quoteToken;
    error Expired(); error Slippage(); error ZeroAmount();
    event Swap(address indexed trader, bool buy, uint256 amountIn, uint256 amountOut);
    constructor(address base_, address quote_) {
        require(block.chainid == 31337, 'LOCAL_ONLY');
        base = IERC20(base_); quoteToken = IERC20(quote_);
    }
    function quote(bool buy, uint256 amountIn) public pure returns (uint256) {
        uint256 net = amountIn * 9970 / 10000;
        return buy ? net * 1e18 / 2845e6 : net * 2845e6 / 1e18;
    }
    function swap(bool buy, uint256 amountIn, uint256 minOut, uint256 deadline) external nonReentrant returns (uint256 out) {
        if (block.timestamp > deadline) revert Expired();
        if (amountIn == 0) revert ZeroAmount();
        out = quote(buy, amountIn);
        if (out == 0 || out < minOut) revert Slippage();
        IERC20 input = buy ? quoteToken : base;
        IERC20 output = buy ? base : quoteToken;
        input.safeTransferFrom(msg.sender, address(this), amountIn);
        output.safeTransfer(msg.sender, out);
        emit Swap(msg.sender, buy, amountIn, out);
    }
}
