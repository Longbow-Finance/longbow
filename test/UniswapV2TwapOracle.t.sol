// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {UniswapV2TwapOracle} from "../src/oracle/UniswapV2TwapOracle.sol";
import {MockUniswapV2Pair} from "./mocks/MockUniswapV2Pair.sol";

contract UniswapV2TwapOracleTest is Test {
    address internal longToken = makeAddr("long");
    address internal weth = makeAddr("weth");

    uint256 internal constant PERIOD = 30 minutes;

    // Normal pool: 1,000,000 LONG (token0) vs 1,000 WETH (token1)
    // => price0 = r1/r0 = 1e21/1e24 = 1e-3 ETH per LONG => 1e15 WAD.
    uint112 internal constant R0 = uint112(1_000_000 ether);
    uint112 internal constant R1_NORMAL = uint112(1_000 ether);
    // Skewed pool: 1,000,000 WETH => price 1.0 ETH per LONG => 1e18 WAD.
    uint112 internal constant R1_SKEW = uint112(1_000_000 ether);

    uint256 internal constant PRICE_NORMAL = 1e15;
    uint256 internal constant PRICE_SKEW = 1e18;

    function _deploy() internal returns (MockUniswapV2Pair pair, UniswapV2TwapOracle oracle) {
        pair = new MockUniswapV2Pair(longToken, weth, R0, R1_NORMAL);
        oracle = new UniswapV2TwapOracle(address(pair), true, PERIOD);
    }

    function test_Constructor_RevertOnEmptyReserves() public {
        MockUniswapV2Pair emptyPair = new MockUniswapV2Pair(longToken, weth, 0, 0);
        vm.expectRevert(UniswapV2TwapOracle.NoReserves.selector);
        new UniswapV2TwapOracle(address(emptyPair), true, PERIOD);
    }

    function test_Update_RevertBeforePeriod() public {
        (, UniswapV2TwapOracle oracle) = _deploy();
        skip(PERIOD - 1);
        vm.expectRevert(UniswapV2TwapOracle.PeriodNotElapsed.selector);
        oracle.update();
    }

    function test_Update_ReflectsStablePrice() public {
        (MockUniswapV2Pair pair, UniswapV2TwapOracle oracle) = _deploy();
        skip(PERIOD);
        pair.setReserves(R0, R1_NORMAL); // accumulate normal price over the window
        oracle.update();
        // ~1 wei tolerance for UQ112x112 truncation.
        assertApproxEqRel(oracle.priceWad(), PRICE_NORMAL, 1e12);
    }

    /// @notice A single-block (flash) manipulation contributes ~zero to the TWAP,
    ///         because it accrues over zero elapsed time.
    function test_FlashManipulation_DoesNotMovePrice() public {
        (MockUniswapV2Pair pair, UniswapV2TwapOracle oracle) = _deploy();

        // Baseline after one full window of the normal price.
        skip(PERIOD);
        pair.setReserves(R0, R1_NORMAL);
        oracle.update();
        assertApproxEqRel(oracle.priceWad(), PRICE_NORMAL, 1e12, "baseline");

        // Flash manipulation within the SAME block: skew up, then revert.
        pair.setReserves(R0, R1_SKEW);
        pair.setReserves(R0, R1_NORMAL);

        // Next window elapses at the normal price.
        skip(PERIOD);
        pair.setReserves(R0, R1_NORMAL);
        oracle.update();

        assertApproxEqRel(oracle.priceWad(), PRICE_NORMAL, 1e12, "flash manipulation ignored");
    }

    /// @notice A price move sustained across a full window DOES move the TWAP -
    ///         confirming the oracle tracks real, time-costly price changes.
    function test_SustainedMove_UpdatesPrice() public {
        (MockUniswapV2Pair pair, UniswapV2TwapOracle oracle) = _deploy();

        skip(PERIOD);
        pair.setReserves(R0, R1_SKEW); // accumulate normal over window; reserves now skewed
        oracle.update();
        assertApproxEqRel(oracle.priceWad(), PRICE_NORMAL, 1e12, "still baseline");

        skip(PERIOD);
        pair.setReserves(R0, R1_SKEW); // accumulate the skewed price over the full window
        oracle.update();
        assertApproxEqRel(oracle.priceWad(), PRICE_SKEW, 1e12, "tracks sustained move");
    }
}
