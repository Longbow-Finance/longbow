// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {LongToken} from "../../src/LongToken.sol";
import {PositionManager} from "../../src/PositionManager.sol";
import {UniswapV2TwapOracle} from "../../src/oracle/UniswapV2TwapOracle.sol";
import {UniswapV2LiquiditySink} from "../../src/periphery/UniswapV2LiquiditySink.sol";
import {IUniswapV2Router02, IUniswapV2Factory, IUniswapV2Pair} from "../../src/interfaces/IUniswapV2.sol";
import {MockPriceOracle} from "../mocks/MockPriceOracle.sol";

/// @notice Integration tests against the REAL Uniswap V2 deployment on Robinhood
///         Chain. These validate the pieces our unit tests can only mock: seeding
///         the pool through the live router, the TWAP oracle reading real
///         cumulative prices, and the liquidity sink zapping ETH into locked LP.
///
/// @dev Gated on `FORK_RPC_URL`. Run with:
///        FORK_RPC_URL=https://rpc.mainnet.chain.robinhood.com \
///          forge test --match-path 'test/fork/*'
///      When the env var is unset (e.g. offline CI), every test skips cleanly.
contract RobinhoodForkTest is Test {
    // Confirmed Robinhood Chain (4663) addresses — reconfirm on Blockscout before mainnet use.
    address internal constant V2_FACTORY = 0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f;
    address internal constant V2_ROUTER = 0x89e5DB8B5aA49aA85AC63f691524311AEB649eba;
    address internal constant WETH = 0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73;
    address internal constant LP_BURN = 0x000000000000000000000000000000000000dEaD;

    uint256 internal constant SUPPLY = 1_000_000_000 ether;
    uint256 internal constant HALF = SUPPLY / 2;
    uint256 internal constant SEED_ETH = 10 ether;
    uint256 internal constant PERIOD = 30 minutes;

    bool internal enabled;
    LongToken internal long;
    address internal pair;
    bool internal longIsToken0;

    receive() external payable {}

    function setUp() public {
        string memory rpc = vm.envOr("FORK_RPC_URL", string(""));
        if (bytes(rpc).length == 0) return; // stays disabled -> tests skip
        vm.createSelectFork(rpc);
        require(V2_ROUTER.code.length > 0, "router not present on fork");
        enabled = true;

        long = new LongToken(SUPPLY, address(this));
        vm.deal(address(this), 100 ether);

        IERC20(address(long)).approve(V2_ROUTER, HALF);
        IUniswapV2Router02(V2_ROUTER).addLiquidityETH{value: SEED_ETH}(
            address(long), HALF, HALF, SEED_ETH, address(this), block.timestamp
        );

        pair = IUniswapV2Factory(V2_FACTORY).getPair(address(long), WETH);
        longIsToken0 = address(long) < WETH;
    }

    function test_Fork_TwapReflectsSeededPrice() public {
        if (!enabled) {
            vm.skip(true);
            return;
        }

        UniswapV2TwapOracle oracle = new UniswapV2TwapOracle(pair, longIsToken0, PERIOD);

        (uint112 r0, uint112 r1,) = IUniswapV2Pair(pair).getReserves();
        uint256 reserveLong = longIsToken0 ? uint256(r0) : uint256(r1);
        uint256 reserveWeth = longIsToken0 ? uint256(r1) : uint256(r0);
        uint256 expected = (reserveWeth * 1e18) / reserveLong;

        skip(PERIOD + 1);
        oracle.update();

        assertApproxEqRel(oracle.priceWad(), expected, 1e15, "TWAP ~ seeded price"); // 0.1%
    }

    function test_Fork_SinkDonateGrowsLockedLp() public {
        if (!enabled) {
            vm.skip(true);
            return;
        }

        UniswapV2LiquiditySink sink = new UniswapV2LiquiditySink(V2_ROUTER, address(long), 500); // 5% slippage
        uint256 lpBefore = IERC20(pair).balanceOf(LP_BURN);

        sink.donate{value: 1 ether}();

        assertGt(IERC20(pair).balanceOf(LP_BURN), lpBefore, "locked LP grew from donation");
        assertEq(address(sink).balance, 0, "sink holds no leftover ETH");
    }

    function test_Fork_LiquidationDonatesIntoRealLp() public {
        if (!enabled) {
            vm.skip(true);
            return;
        }

        // Use a mock oracle for deterministic price control; real sink + real LP.
        MockPriceOracle oracle = new MockPriceOracle(1e15);
        UniswapV2LiquiditySink sink = new UniswapV2LiquiditySink(V2_ROUTER, address(long), 500);
        PositionManager pm = new PositionManager(
            address(long), address(oracle), address(sink), address(this), 10 ether, 500, 100, 0.01 ether
        );
        long.transfer(address(pm), 100_000_000 ether); // reserve

        address user = makeAddr("user");
        vm.deal(user, 10 ether);
        vm.prank(user);
        uint256 id = pm.openPosition{value: 1 ether}(2 ether);

        oracle.setPrice(1e15 / 2); // drop 50% -> liquidatable at 2x

        uint256 lpBefore = IERC20(pair).balanceOf(LP_BURN);
        pm.liquidate(id); // this contract acts as keeper
        assertGt(IERC20(pair).balanceOf(LP_BURN), lpBefore, "liquidation locked new LP");
        assertFalse(pm.getPosition(id).open, "position closed");
    }
}
