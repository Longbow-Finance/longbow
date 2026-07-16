// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {LongToken} from "../src/LongToken.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {UniswapV3TwapOracle} from "../src/oracle/UniswapV3TwapOracle.sol";
import {UniswapV3LiquiditySink} from "../src/periphery/UniswapV3LiquiditySink.sol";
import {INonfungiblePositionManager, IUniswapV3Pool, IWETH9} from "../src/interfaces/IUniswapV3.sol";
import {FullMath} from "../src/libraries/FullMath.sol";
import {TickMath} from "../src/libraries/TickMath.sol";

/// @notice Deploys the Longbow contract suite to Robinhood Chain (or a fork),
///         using Uniswap **V3** for liquidity and pricing.
///
/// Flow:
///   1. Deploy LONG with full supply minted to the deployer.
///   2. Create + initialize the Uniswap V3 LONG/WETH pool at the genesis price
///      P0 = SEED_ETH / (TOTAL_SUPPLY / 2), then grow its observation cardinality
///      so the TWAP oracle has history to average over.
///   3. Mint a full-range seed position (50% of supply + SEED_ETH). The LP NFT
///      goes to the deployer (you keep and manage your own seed liquidity).
///   4. Deploy the V3 TWAP oracle over the pool.
///   5. Deploy the UniswapV3LiquiditySink (locks liquidated collateral forever).
///   6. Deploy the PositionManager and transfer the remaining 50% as its reserve.
///
/// Required env:
///   PRIVATE_KEY   deployer key
/// Optional env (sensible defaults shown in code — VERIFY the Uniswap V3
/// addresses on Blockscout before broadcasting):
///   TOTAL_SUPPLY, SEED_ETH, UNISWAP_V3_POSITION_MANAGER, UNISWAP_V3_SWAP_ROUTER,
///   WETH, POOL_FEE, OBSERVATION_CARDINALITY, TWAP_PERIOD, MAX_MULTIPLIER_WAD,
///   MAINTENANCE_MARGIN_BPS, LIQUIDATION_BOUNTY_BPS, MIN_COLLATERAL,
///   SINK_SLIPPAGE_BPS
contract Deploy is Script {
    struct Config {
        uint256 pk;
        address deployer;
        uint256 totalSupply;
        uint256 seedEth;
        address positionManager;
        address swapRouter;
        address weth;
        uint24 poolFee;
        uint16 observationCardinality;
        uint32 twapPeriod;
        uint256 maxMultiplierWad;
        uint256 maintenanceMarginBps;
        uint256 liquidationBountyBps;
        uint256 minCollateral;
        uint256 sinkSlippageBps;
    }

    function _config() internal view returns (Config memory c) {
        c.pk = vm.envUint("PRIVATE_KEY");
        c.deployer = vm.addr(c.pk);
        c.totalSupply = vm.envOr("TOTAL_SUPPLY", uint256(1_000_000_000 ether));
        c.seedEth = vm.envOr("SEED_ETH", uint256(10 ether));

        // Uniswap V3 on Robinhood Chain (4663) — VERIFY on Blockscout before use.
        c.positionManager = vm.envOr("UNISWAP_V3_POSITION_MANAGER", address(0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3));
        c.swapRouter = vm.envOr("UNISWAP_V3_SWAP_ROUTER", address(0xCaf681a66D020601342297493863E78C959E5cb2));
        c.weth = vm.envOr("WETH", address(0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73));
        c.poolFee = uint24(vm.envOr("POOL_FEE", uint256(10_000))); // 1% tier
        c.observationCardinality = uint16(vm.envOr("OBSERVATION_CARDINALITY", uint256(200)));

        c.twapPeriod = uint32(vm.envOr("TWAP_PERIOD", uint256(30 minutes)));
        c.maxMultiplierWad = vm.envOr("MAX_MULTIPLIER_WAD", uint256(10 ether));
        c.maintenanceMarginBps = vm.envOr("MAINTENANCE_MARGIN_BPS", uint256(500));
        c.liquidationBountyBps = vm.envOr("LIQUIDATION_BOUNTY_BPS", uint256(100));
        c.minCollateral = vm.envOr("MIN_COLLATERAL", uint256(0.01 ether));
        c.sinkSlippageBps = vm.envOr("SINK_SLIPPAGE_BPS", uint256(100));
    }

    function run() external {
        Config memory c = _config();
        uint256 half = c.totalSupply / 2;

        vm.startBroadcast(c.pk);

        LongToken long = new LongToken(c.totalSupply, c.deployer);

        address pool = _createAndSeedPool(c, address(long), half);

        UniswapV3TwapOracle oracle = new UniswapV3TwapOracle(pool, address(long), c.twapPeriod);
        UniswapV3LiquiditySink sink =
            new UniswapV3LiquiditySink(c.swapRouter, c.positionManager, pool, address(long), c.sinkSlippageBps);

        PositionManager pm = new PositionManager(
            address(long),
            address(oracle),
            address(sink),
            c.deployer,
            c.maxMultiplierWad,
            c.maintenanceMarginBps,
            c.liquidationBountyBps,
            c.minCollateral
        );
        require(IERC20(address(long)).transfer(address(pm), half), "reserve transfer failed");

        vm.stopBroadcast();

        console2.log("LongToken:       ", address(long));
        console2.log("V3 Pool:         ", pool);
        console2.log("Oracle:          ", address(oracle));
        console2.log("LiquiditySink:   ", address(sink));
        console2.log("PositionManager: ", address(pm));
        console2.log("Reserve (LONG):  ", long.balanceOf(address(pm)));
    }

    /// @dev Creates + initializes the V3 pool at the genesis price, grows the
    ///      observation cardinality, and mints the full-range seed position.
    function _createAndSeedPool(Config memory c, address long, uint256 half) internal returns (address pool) {
        (address token0, address token1) = long < c.weth ? (long, c.weth) : (c.weth, long);

        pool = INonfungiblePositionManager(c.positionManager)
            .createAndInitializePoolIfNecessary(
                token0,
                token1,
                c.poolFee,
                long < c.weth ? _encodeSqrtPriceX96(c.seedEth, half) : _encodeSqrtPriceX96(half, c.seedEth)
            );
        IUniswapV3Pool(pool).increaseObservationCardinalityNext(c.observationCardinality);

        _mintSeedPosition(c, long, half, pool);
    }

    /// @dev Wraps the seed ETH and mints the full-range seed position to the deployer.
    function _mintSeedPosition(Config memory c, address long, uint256 half, address pool) internal {
        IWETH9(c.weth).deposit{value: c.seedEth}();
        IERC20(long).approve(c.positionManager, half);
        IERC20(c.weth).approve(c.positionManager, c.seedEth);

        int24 spacing = IUniswapV3Pool(pool).tickSpacing();

        INonfungiblePositionManager(c.positionManager)
            .mint(
                INonfungiblePositionManager.MintParams({
                token0: long < c.weth ? long : c.weth,
                token1: long < c.weth ? c.weth : long,
                fee: c.poolFee,
                tickLower: (TickMath.MIN_TICK / spacing) * spacing,
                tickUpper: (TickMath.MAX_TICK / spacing) * spacing,
                amount0Desired: long < c.weth ? half : c.seedEth,
                amount1Desired: long < c.weth ? c.seedEth : half,
                amount0Min: 0,
                amount1Min: 0,
                recipient: c.deployer,
                deadline: block.timestamp
            })
            );
    }

    /// @dev sqrtPriceX96 = sqrt(amount1 / amount0) * 2^96, computed at full
    ///      precision as sqrt(amount1 * 2^192 / amount0).
    function _encodeSqrtPriceX96(uint256 amount1, uint256 amount0) internal pure returns (uint160) {
        uint256 ratioX192 = FullMath.mulDiv(amount1, 1 << 192, amount0);
        uint256 s = _sqrt(ratioX192);
        require(s <= type(uint160).max, "sqrtPrice overflow");
        return uint160(s);
    }

    /// @dev Babylonian integer square root.
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
