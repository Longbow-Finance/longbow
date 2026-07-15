// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {LongToken} from "../src/LongToken.sol";
import {PositionManager} from "../src/PositionManager.sol";
import {MockPriceOracle} from "./mocks/MockPriceOracle.sol";
import {MockLiquiditySink} from "./mocks/MockLiquiditySink.sol";

/// @notice Drives the PositionManager through randomised open/close/liquidate/price
///         sequences while maintaining ghost accounting for the invariants.
contract Handler is Test {
    PositionManager public pm;
    LongToken public long;
    MockPriceOracle public oracle;

    uint256 public constant P0 = 1e15;
    uint256 internal constant WAD = 1e18;

    uint256[] public openIds;
    mapping(uint256 => uint256) public collateralOf;
    uint256 public sumOpenCollateral;

    constructor(PositionManager pm_, LongToken long_, MockPriceOracle oracle_) {
        pm = pm_;
        long = long_;
        oracle = oracle_;
        vm.deal(address(this), 1_000_000 ether);
    }

    receive() external payable {}

    function open(uint256 collateralSeed, uint256 multSeed) public {
        uint256 collateral = bound(collateralSeed, pm.minCollateral(), 100 ether);
        uint256 mult = bound(multSeed, WAD, pm.maxMultiplierWad());
        if (address(this).balance < collateral) return;
        // Respect reserve capacity; skip if it would revert.
        uint256 earmark = (collateral * mult) / oracle.priceWad();
        if (earmark > pm.availableReserve()) return;

        uint256 id = pm.openPosition{value: collateral}(mult);
        openIds.push(id);
        collateralOf[id] = collateral;
        sumOpenCollateral += collateral;
    }

    function close(uint256 idxSeed) public {
        if (openIds.length == 0) return;
        uint256 idx = bound(idxSeed, 0, openIds.length - 1);
        uint256 id = openIds[idx];
        if (pm.isLiquidatable(id)) return; // would revert
        pm.closePosition(id);
        _removeAt(idx);
    }

    function liquidate(uint256 idxSeed) public {
        if (openIds.length == 0) return;
        uint256 idx = bound(idxSeed, 0, openIds.length - 1);
        uint256 id = openIds[idx];
        if (!pm.isLiquidatable(id)) return; // would revert
        pm.liquidate(id);
        _removeAt(idx);
    }

    function movePrice(uint256 priceSeed) public {
        // Keep price in a band that can trigger both profits and liquidations.
        oracle.setPrice(bound(priceSeed, P0 / 4, P0 * 8));
    }

    function _removeAt(uint256 idx) internal {
        uint256 id = openIds[idx];
        sumOpenCollateral -= collateralOf[id];
        collateralOf[id] = 0;
        openIds[idx] = openIds[openIds.length - 1];
        openIds.pop();
    }
}

contract PositionManagerInvariantTest is StdInvariant, Test {
    LongToken internal long;
    MockPriceOracle internal oracle;
    MockLiquiditySink internal sink;
    PositionManager internal pm;
    Handler internal handler;

    uint256 internal constant SUPPLY = 1_000_000_000 ether;
    uint256 internal constant RESERVE = SUPPLY / 2;
    uint256 internal constant P0 = 1e15;

    function setUp() public {
        long = new LongToken(SUPPLY, address(this));
        oracle = new MockPriceOracle(P0);
        sink = new MockLiquiditySink();
        pm = new PositionManager(
            address(long), address(oracle), address(sink), address(this), 10 ether, 500, 100, 0.01 ether
        );
        long.transfer(address(pm), RESERVE);

        handler = new Handler(pm, long, oracle);

        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = Handler.open.selector;
        selectors[1] = Handler.close.selector;
        selectors[2] = Handler.liquidate.selector;
        selectors[3] = Handler.movePrice.selector;
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
        targetContract(address(handler));
    }

    /// @notice The core solvency invariant: earmarks never exceed the reserve.
    function invariant_EarmarkedNeverExceedsReserve() public view {
        assertLe(pm.totalEarmarked(), pm.reserveBalance());
    }

    /// @notice The contract's ETH always equals the collateral of open positions.
    function invariant_EthBackedByOpenCollateral() public view {
        assertEq(address(pm).balance, handler.sumOpenCollateral());
    }

    /// @notice The reserve can always fully honour every earmark simultaneously.
    function invariant_ReserveSolvent() public view {
        assertGe(pm.reserveBalance(), pm.totalEarmarked());
    }
}
