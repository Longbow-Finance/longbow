// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {LongToken} from "../src/LongToken.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {UniswapV2TwapOracle} from "../src/oracle/UniswapV2TwapOracle.sol";
import {UniswapV2LiquiditySink} from "../src/periphery/UniswapV2LiquiditySink.sol";
import {IUniswapV2Router02, IUniswapV2Factory} from "../src/interfaces/IUniswapV2.sol";

/// @notice Deploys the Longbow contract suite to Robinhood Chain (or a fork).
///
/// Flow:
///   1. Deploy LONG with full supply minted to the deployer.
///   2. Seed the Uniswap V2 LONG/WETH pool with 50% of supply + SEED_ETH,
///      which sets the genesis price P0. LP tokens go to the deployer.
///   3. Deploy the TWAP oracle over the freshly created pair.
///   4. Deploy the UniswapV2LiquiditySink (locks liquidated collateral forever).
///   5. Deploy the PositionManager and transfer the remaining 50% as its reserve.
///
/// Required env:
///   PRIVATE_KEY           deployer key
///   UNISWAP_V2_ROUTER     Uniswap V2 router address on Robinhood Chain
/// Optional env (sensible defaults shown in code):
///   TOTAL_SUPPLY, SEED_ETH, TWAP_PERIOD, MAX_MULTIPLIER_WAD,
///   MAINTENANCE_MARGIN_BPS, LIQUIDATION_BOUNTY_BPS, MIN_COLLATERAL, SINK_SLIPPAGE_BPS
contract Deploy is Script {
    struct Config {
        uint256 pk;
        address deployer;
        uint256 totalSupply;
        uint256 seedEth;
        address router;
        uint256 twapPeriod;
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
        // Confirmed Uniswap V2 router on Robinhood Chain (4663); override via env.
        c.router = vm.envOr("UNISWAP_V2_ROUTER", address(0x89e5DB8B5aA49aA85AC63f691524311AEB649eba));
        c.twapPeriod = vm.envOr("TWAP_PERIOD", uint256(30 minutes));
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

        address pair = _seedPool(c, address(long), half);

        UniswapV2TwapOracle oracle =
            new UniswapV2TwapOracle(pair, address(long) < IUniswapV2Router02(c.router).WETH(), c.twapPeriod);
        UniswapV2LiquiditySink sink = new UniswapV2LiquiditySink(c.router, address(long), c.sinkSlippageBps);

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
        console2.log("Pair:            ", pair);
        console2.log("Oracle:          ", address(oracle));
        console2.log("LiquiditySink:   ", address(sink));
        console2.log("PositionManager: ", address(pm));
        console2.log("Reserve (LONG):  ", long.balanceOf(address(pm)));
    }

    function _seedPool(Config memory c, address long, uint256 amount) internal returns (address pair) {
        IUniswapV2Router02 uni = IUniswapV2Router02(c.router);
        IERC20(long).approve(c.router, amount);
        uni.addLiquidityETH{value: c.seedEth}(long, amount, amount, c.seedEth, c.deployer, block.timestamp);
        pair = IUniswapV2Factory(uni.factory()).getPair(long, uni.WETH());
    }
}
