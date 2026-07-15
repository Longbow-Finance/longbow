// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/*//////////////////////////////////////////////////////////////////////////////
                                    LONGBOW
                 The leverage layer for $LONG on Robinhood Chain

    Website   https://longbowfi.xyz
    X         https://x.com/longbowfi
    GitHub    https://github.com/Longbow-Finance
//////////////////////////////////////////////////////////////////////////////*/

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ILiquiditySink} from "../interfaces/ILiquiditySink.sol";
import {IUniswapV2Router02} from "../interfaces/IUniswapV2.sol";

/// @title UniswapV2LiquiditySink
/// @notice Turns forfeited (liquidated) ETH collateral into permanent LONG/WETH
///         liquidity. Half the ETH is swapped for LONG, then both legs are added
///         as liquidity; the resulting LP tokens are sent to a burn address so the
///         liquidity can never be withdrawn - exactly matching Longbow's rule that
///         a liquidated deposit "forever" supports the pool.
/// @dev    Confirm the Uniswap V2 router address on Robinhood Chain before use.
contract UniswapV2LiquiditySink is ILiquiditySink {
    using SafeERC20 for IERC20;

    /// @dev Standard non-zero burn sink for LP tokens (locks liquidity forever).
    address public constant LP_BURN = 0x000000000000000000000000000000000000dEaD;

    IUniswapV2Router02 public immutable router;
    IERC20 public immutable long;
    address public immutable weth;

    /// @notice Max acceptable slippage on the internal swap/add, in bps.
    uint256 public immutable slippageBps;

    error NothingToDonate();

    constructor(address router_, address long_, uint256 slippageBps_) {
        require(router_ != address(0) && long_ != address(0), "sink: zero addr");
        require(slippageBps_ < 10_000, "sink: bad slippage");
        router = IUniswapV2Router02(router_);
        long = IERC20(long_);
        weth = IUniswapV2Router02(router_).WETH();
        slippageBps = slippageBps_;
    }

    /// @inheritdoc ILiquiditySink
    function donate() external payable {
        uint256 amount = msg.value;
        if (amount == 0) revert NothingToDonate();

        uint256 half = amount / 2;
        uint256 rest = amount - half;

        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = address(long);

        uint256[] memory out = router.swapExactETHForTokens{value: half}(0, path, address(this), block.timestamp);
        uint256 longReceived = out[out.length - 1];

        long.forceApprove(address(router), longReceived);

        uint256 minLong = longReceived - (longReceived * slippageBps) / 10_000;
        uint256 minEth = rest - (rest * slippageBps) / 10_000;

        router.addLiquidityETH{value: rest}(address(long), longReceived, minLong, minEth, LP_BURN, block.timestamp);

        // Reset any residual approval.
        long.forceApprove(address(router), 0);
    }

    receive() external payable {}
}
