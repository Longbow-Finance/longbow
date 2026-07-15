// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {LongToken} from "../src/LongToken.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {MockPriceOracle} from "./mocks/MockPriceOracle.sol";
import {MockLiquiditySink} from "./mocks/MockLiquiditySink.sol";

contract PositionManagerTest is Test {
    LongToken internal long;
    MockPriceOracle internal oracle;
    MockLiquiditySink internal sink;
    PositionManager internal pm;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal keeper = makeAddr("keeper");

    uint256 internal constant WAD = 1e18;
    uint256 internal constant SUPPLY = 1_000_000_000 ether;
    uint256 internal constant RESERVE = SUPPLY / 2;
    uint256 internal constant P0 = 1e15; // 0.001 ETH per LONG

    uint256 internal constant MAX_MULT = 10 ether; // 10x
    uint256 internal constant MM_BPS = 500; // 5%
    uint256 internal constant BOUNTY_BPS = 100; // 1%
    uint256 internal constant MIN_COLLATERAL = 0.01 ether;

    function setUp() public {
        long = new LongToken(SUPPLY, address(this));
        oracle = new MockPriceOracle(P0);
        sink = new MockLiquiditySink();
        pm = new PositionManager(
            address(long), address(oracle), address(sink), owner, MAX_MULT, MM_BPS, BOUNTY_BPS, MIN_COLLATERAL
        );
        // Seed the reserve with 50% of supply.
        long.transfer(address(pm), RESERVE);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _open(address who, uint256 collateral, uint256 mult) internal returns (uint256 id) {
        vm.prank(who);
        id = pm.openPosition{value: collateral}(mult);
    }

    // ---------------------------------------------------------------------
    // Open
    // ---------------------------------------------------------------------

    function test_Open_EarmarksMaxReward() public {
        uint256 id = _open(alice, 1 ether, 2 ether); // 2x
        PositionManager.Position memory p = pm.getPosition(id);

        // maxReward = collateral * m / P0 = 1e18 * 2e18 / 1e15 = 2e21
        assertEq(p.earmark, 2e21, "earmark");
        assertEq(p.collateral, 1 ether, "collateral");
        assertEq(p.entryPriceWad, P0, "entry price");
        assertEq(p.multiplierWad, 2 ether, "mult");
        assertTrue(p.open);
        assertEq(pm.totalEarmarked(), 2e21);
        assertEq(pm.availableReserve(), RESERVE - 2e21);
        assertEq(address(pm).balance, 1 ether);
    }

    function test_Open_RevertMultiplierTooLow() public {
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        vm.expectRevert(PositionManager.InvalidMultiplier.selector);
        pm.openPosition{value: 1 ether}(WAD - 1);
    }

    function test_Open_RevertMultiplierTooHigh() public {
        vm.prank(alice);
        vm.expectRevert(PositionManager.InvalidMultiplier.selector);
        pm.openPosition{value: 1 ether}(MAX_MULT + 1);
    }

    function test_Open_RevertCollateralTooLow() public {
        vm.prank(alice);
        vm.expectRevert(PositionManager.CollateralTooLow.selector);
        pm.openPosition{value: MIN_COLLATERAL - 1}(2 ether);
    }

    function test_Open_RevertPriceUnavailable() public {
        oracle.setPrice(0);
        vm.prank(alice);
        vm.expectRevert(PositionManager.PriceUnavailable.selector);
        pm.openPosition{value: 1 ether}(2 ether);
    }

    function test_Open_RevertInsufficientReserve() public {
        // With a tiny price, earmark = collateral * m / P0 explodes past the reserve.
        oracle.setPrice(1); // 1 wei ETH per LONG
        vm.prank(alice);
        vm.expectRevert(PositionManager.InsufficientReserve.selector);
        pm.openPosition{value: 1 ether}(2 ether);
    }

    // ---------------------------------------------------------------------
    // Close
    // ---------------------------------------------------------------------

    function test_Close_InProfit_PaysRewardAndReturnsFullCollateral() public {
        uint256 id = _open(alice, 1 ether, 2 ether);
        oracle.setPrice(2 * P0); // price doubles

        // reward = earmark * (P - P0) / P = 2e21 * 1e15 / 2e15 = 1e21
        uint256 expectedReward = 1e21;
        assertEq(pm.pendingReward(id), expectedReward);

        uint256 ethBefore = alice.balance;
        vm.prank(alice);
        pm.closePosition(id);

        // In profit: ETH leg capped at the initial deposit, nothing to pool.
        assertEq(long.balanceOf(alice), expectedReward, "reward paid");
        assertEq(alice.balance, ethBefore + 1 ether, "full collateral returned");
        assertEq(sink.totalDonated(), 0, "no shortfall to pool");
        assertEq(pm.totalEarmarked(), 0, "earmark released");
        assertFalse(pm.getPosition(id).open);
    }

    function test_Close_AtLoss_ReturnsPartialEthAndDonatesShortfall() public {
        uint256 id = _open(alice, 1 ether, 2 ether);
        oracle.setPrice((P0 * 9) / 10); // down 10%, still healthy (rLiq = 0.525)

        // equity = collateral * (1 + m*(P-P0)/P0) = 1e18 * (1 + 2*(-0.1)) = 0.8 ETH
        uint256 expectedEquity = 0.8 ether;
        assertEq(pm.positionEquity(id), expectedEquity);
        assertEq(pm.pendingReward(id), 0);

        uint256 ethBefore = alice.balance;
        vm.prank(alice);
        pm.closePosition(id);

        assertEq(long.balanceOf(alice), 0, "no reward below entry");
        assertEq(alice.balance, ethBefore + expectedEquity, "partial ETH returned");
        assertEq(sink.totalDonated(), 1 ether - expectedEquity, "shortfall donated to pool");
        assertEq(address(pm).balance, 0, "collateral fully disbursed");
        assertEq(pm.totalEarmarked(), 0, "earmark released");
    }

    function test_Close_AtEntry_ReturnsFullCollateral() public {
        uint256 id = _open(alice, 1 ether, 3 ether);
        // Price unchanged: equity == collateral, no reward, nothing to pool.
        uint256 ethBefore = alice.balance;
        vm.prank(alice);
        pm.closePosition(id);

        assertEq(alice.balance, ethBefore + 1 ether, "full collateral at entry");
        assertEq(long.balanceOf(alice), 0, "no reward at entry");
        assertEq(sink.totalDonated(), 0, "nothing to pool at entry");
    }

    function test_Close_RevertNotOwner() public {
        uint256 id = _open(alice, 1 ether, 2 ether);
        vm.prank(bob);
        vm.expectRevert(PositionManager.NotPositionOwner.selector);
        pm.closePosition(id);
    }

    function test_Close_RevertWhenLiquidatable() public {
        uint256 id = _open(alice, 1 ether, 2 ether);
        oracle.setPrice(P0 / 2); // below liquidation price (0.525*P0)
        vm.prank(alice);
        vm.expectRevert(PositionManager.PositionLiquidatable.selector);
        pm.closePosition(id);
    }

    function test_Close_RevertNotOpen() public {
        uint256 id = _open(alice, 1 ether, 2 ether);
        vm.prank(alice);
        pm.closePosition(id);
        vm.prank(alice);
        vm.expectRevert(PositionManager.PositionNotOpen.selector);
        pm.closePosition(id);
    }

    // ---------------------------------------------------------------------
    // Liquidation
    // ---------------------------------------------------------------------

    function test_Liquidate_DonatesCollateralAndPaysBounty() public {
        uint256 id = _open(alice, 1 ether, 2 ether);
        oracle.setPrice(P0 / 2); // equity hits 0 for 2x

        uint256 keeperBefore = keeper.balance;
        vm.prank(keeper);
        pm.liquidate(id);

        uint256 bounty = (1 ether * BOUNTY_BPS) / 1e4; // 0.01 ETH
        uint256 donation = 1 ether - bounty;

        assertEq(keeper.balance, keeperBefore + bounty, "bounty");
        assertEq(sink.totalDonated(), donation, "donation");
        assertEq(address(pm).balance, 0, "collateral fully disbursed");
        assertEq(pm.totalEarmarked(), 0, "earmark released");
        assertEq(long.balanceOf(alice), 0, "reward forfeited");
        assertFalse(pm.getPosition(id).open);
    }

    function test_Liquidate_RevertWhenHealthy() public {
        uint256 id = _open(alice, 1 ether, 2 ether);
        vm.prank(keeper);
        vm.expectRevert(PositionManager.PositionNotLiquidatable.selector);
        pm.liquidate(id);
    }

    function test_LiquidationPrice_Math() public {
        // 2x: P_liq = P0 * (1 - (1 - 0.05)/2) = P0 * 0.525
        uint256 id2 = _open(alice, 1 ether, 2 ether);
        assertEq(pm.liquidationPrice(id2), (P0 * 525) / 1000);

        // 10x: P_liq = P0 * (1 - 0.95/10) = P0 * 0.905
        uint256 id10 = _open(bob, 1 ether, 10 ether);
        assertEq(pm.liquidationPrice(id10), (P0 * 905) / 1000);

        // 1x: P_liq = P0 * (1 - 0.95) = P0 * 0.05
        uint256 id1 = _open(alice, 1 ether, 1 ether);
        assertEq(pm.liquidationPrice(id1), (P0 * 5) / 100);
    }

    function test_Liquidate_JustBelowThreshold() public {
        uint256 id = _open(alice, 1 ether, 2 ether);
        uint256 liq = pm.liquidationPrice(id);
        // Exactly at threshold -> liquidatable (<=).
        oracle.setPrice(liq);
        assertTrue(pm.isLiquidatable(id));
        // Just above -> healthy.
        oracle.setPrice(liq + 1);
        assertFalse(pm.isLiquidatable(id));
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function test_Admin_SetParams() public {
        vm.prank(owner);
        pm.setParams(5 ether, 800, 200, 0.05 ether);
        assertEq(pm.maxMultiplierWad(), 5 ether);
        assertEq(pm.maintenanceMarginBps(), 800);
        assertEq(pm.liquidationBountyBps(), 200);
        assertEq(pm.minCollateral(), 0.05 ether);
    }

    function test_Admin_SetParams_RevertNotOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        pm.setParams(5 ether, 800, 200, 0.05 ether);
    }

    function test_Admin_SetParams_RevertBountyExceedsMargin() public {
        vm.prank(owner);
        vm.expectRevert(bytes("bounty > mm"));
        pm.setParams(5 ether, 500, 600, 0.05 ether);
    }

    function test_Admin_SetOracleAndSink() public {
        MockPriceOracle newOracle = new MockPriceOracle(P0);
        MockLiquiditySink newSink = new MockLiquiditySink();
        vm.startPrank(owner);
        pm.setOracle(address(newOracle));
        pm.setLiquiditySink(address(newSink));
        vm.stopPrank();
        assertEq(address(pm.oracle()), address(newOracle));
        assertEq(address(pm.liquiditySink()), address(newSink));
    }

    // ---------------------------------------------------------------------
    // Fuzz: core solvency guarantees
    // ---------------------------------------------------------------------

    /// @dev A position's claimable reward is always strictly below its earmark,
    ///      and the reserve can always cover it, at ANY price.
    function testFuzz_RewardNeverExceedsEarmark(uint256 collateral, uint256 mult, uint256 newPrice) public {
        collateral = bound(collateral, MIN_COLLATERAL, 50 ether);
        mult = bound(mult, WAD, MAX_MULT);
        vm.deal(alice, collateral);

        uint256 id = _open(alice, collateral, mult);
        uint256 earmark = pm.getPosition(id).earmark;

        newPrice = bound(newPrice, 1, P0 * 1_000_000);
        oracle.setPrice(newPrice);

        uint256 reward = pm.pendingReward(id);
        assertLe(reward, earmark, "reward <= earmark");
        assertLe(reward, pm.reserveBalance(), "reserve covers reward");
        if (newPrice > P0) assertGt(reward, 0, "profit accrues above entry");
        if (newPrice <= P0) assertEq(reward, 0, "no reward at/below entry");
    }

    /// @dev The earmark invariant holds across many concurrent opens.
    function testFuzz_EarmarkInvariantAcrossOpens(uint256 n) public {
        n = bound(n, 1, 20);
        vm.deal(alice, 1000 ether);
        for (uint256 i = 0; i < n; i++) {
            uint256 mult = bound(uint256(keccak256(abi.encode(i))), WAD, MAX_MULT);
            vm.prank(alice);
            pm.openPosition{value: 1 ether}(mult);
            assertLe(pm.totalEarmarked(), pm.reserveBalance(), "totalEarmarked <= reserve");
        }
    }
}
