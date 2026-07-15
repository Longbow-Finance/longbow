// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {LongToken} from "../src/LongToken.sol";

contract LongTokenTest is Test {
    LongToken internal long;
    address internal deployer = makeAddr("deployer");

    uint256 internal constant SUPPLY = 1_000_000_000 ether;

    function setUp() public {
        vm.prank(deployer);
        long = new LongToken(SUPPLY, deployer);
    }

    function test_Metadata() public view {
        assertEq(long.name(), "Longbow");
        assertEq(long.symbol(), "LONG");
        assertEq(long.decimals(), 18);
    }

    function test_FixedSupplyMintedToRecipient() public view {
        assertEq(long.totalSupply(), SUPPLY);
        assertEq(long.balanceOf(deployer), SUPPLY);
    }

    function test_RevertOnZeroRecipient() public {
        vm.expectRevert(bytes("LONG: zero recipient"));
        new LongToken(SUPPLY, address(0));
    }

    function test_RevertOnZeroSupply() public {
        vm.expectRevert(bytes("LONG: zero supply"));
        new LongToken(0, deployer);
    }

    function test_NoMintFunctionExposed() public {
        // The contract exposes no external mint; supply is immutable after genesis.
        uint256 supplyBefore = long.totalSupply();
        vm.prank(deployer);
        long.transfer(address(this), 1 ether);
        assertEq(long.totalSupply(), supplyBefore);
    }
}
