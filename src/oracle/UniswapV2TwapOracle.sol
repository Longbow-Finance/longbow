// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/*//////////////////////////////////////////////////////////////////////////////
                                    LONGBOW
                 The leverage layer for $LONG on Robinhood Chain

    Website   https://longbowfi.xyz
    X         https://x.com/longbowfi
    GitHub    https://github.com/Longbow-Finance
//////////////////////////////////////////////////////////////////////////////*/

import {IPriceOracle} from "../interfaces/IPriceOracle.sol";
import {IUniswapV2Pair} from "../interfaces/IUniswapV2.sol";

/// @title UniswapV2TwapOracle
/// @notice Fixed-window TWAP oracle over a Uniswap V2 LONG/WETH pair, exposing the
///         price of LONG in ETH as a WAD. Uses the pair's cumulative-price
///         accumulators (UQ112x112), which makes it resistant to single-block /
///         flash-loan manipulation: an attacker would have to hold a manipulated
///         price across the whole averaging window.
/// @dev    A keeper calls `update()` at least once per `period`. `priceWad()`
///         returns the most recent completed average. Pluggable behind
///         `IPriceOracle`, so it can be swapped for a Chainlink feed later.
contract UniswapV2TwapOracle is IPriceOracle {
    uint256 private constant Q112 = 2 ** 112;

    IUniswapV2Pair public immutable pair;
    /// @notice True if LONG is token0 of the pair (so ETH/LONG == price0).
    bool public immutable longIsToken0;
    /// @notice Minimum averaging window, in seconds.
    uint256 public immutable period;

    uint256 public priceCumulativeLast;
    uint32 public blockTimestampLast;
    /// @notice Last completed TWAP of LONG in ETH, WAD.
    uint256 public priceAverageWad;

    error PeriodNotElapsed();
    error NoReserves();

    /// @param pair_        The Uniswap V2 LONG/WETH pair.
    /// @param longIsToken0_ Whether LONG is token0 in that pair.
    /// @param period_      Minimum TWAP window in seconds (e.g. 1800 = 30 min).
    constructor(address pair_, bool longIsToken0_, uint256 period_) {
        require(pair_ != address(0), "oracle: zero pair");
        require(period_ > 0, "oracle: zero period");
        pair = IUniswapV2Pair(pair_);
        longIsToken0 = longIsToken0_;
        period = period_;

        (uint112 r0, uint112 r1, uint32 ts) = IUniswapV2Pair(pair_).getReserves();
        if (r0 == 0 || r1 == 0) revert NoReserves();
        priceCumulativeLast = longIsToken0_ ? _price0Cumulative() : _price1Cumulative();
        blockTimestampLast = ts;
    }

    /// @notice Advance the TWAP window. Reverts if `period` has not elapsed since
    ///         the last update, guaranteeing each recorded average spans >= period.
    function update() external {
        (uint256 cumulative, uint32 blockTimestamp) =
            longIsToken0 ? (_price0Cumulative(), _now()) : (_price1Cumulative(), _now());

        uint32 timeElapsed;
        unchecked {
            timeElapsed = blockTimestamp - blockTimestampLast; // wraps mod 2^32, matching Uniswap
        }
        if (timeElapsed < period) revert PeriodNotElapsed();

        // averagePrice is a UQ112x112 value: (deltaCumulative / timeElapsed).
        uint256 averageUQ;
        unchecked {
            averageUQ = (cumulative - priceCumulativeLast) / timeElapsed;
        }
        // Convert UQ112x112 -> WAD (ETH per LONG).
        priceAverageWad = (averageUQ * 1e18) / Q112;

        priceCumulativeLast = cumulative;
        blockTimestampLast = blockTimestamp;
    }

    /// @inheritdoc IPriceOracle
    function priceWad() external view returns (uint256) {
        return priceAverageWad;
    }

    // -------------------------------------------------------------------------
    // Cumulative price helpers (mirror Uniswap V2's counterfactual accumulation)
    // -------------------------------------------------------------------------

    function _now() private view returns (uint32) {
        return uint32(block.timestamp % 2 ** 32);
    }

    function _price0Cumulative() private view returns (uint256 cumulative) {
        cumulative = pair.price0CumulativeLast();
        (uint112 r0, uint112 r1, uint32 tsLast) = pair.getReserves();
        uint32 ts = _now();
        if (tsLast != ts && r0 != 0 && r1 != 0) {
            uint32 elapsed;
            unchecked {
                elapsed = ts - tsLast;
            }
            // price0 = reserve1/reserve0 in UQ112x112 = (r1 << 112) / r0.
            // Division precedes multiplication intentionally to mirror Uniswap V2's
            // overflow-safe accumulation; reordering risks overflow of the UQ value.
            // forge-lint: disable-next-line(divide-before-multiply)
            cumulative += ((uint256(r1) * Q112) / r0) * elapsed;
        }
    }

    function _price1Cumulative() private view returns (uint256 cumulative) {
        cumulative = pair.price1CumulativeLast();
        (uint112 r0, uint112 r1, uint32 tsLast) = pair.getReserves();
        uint32 ts = _now();
        if (tsLast != ts && r0 != 0 && r1 != 0) {
            uint32 elapsed;
            unchecked {
                elapsed = ts - tsLast;
            }
            // price1 = reserve0/reserve1 in UQ112x112 = (r0 << 112) / r1.
            // forge-lint: disable-next-line(divide-before-multiply)
            cumulative += ((uint256(r0) * Q112) / r1) * elapsed;
        }
    }
}
