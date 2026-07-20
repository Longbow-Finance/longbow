// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {UniswapV3LpLocker} from "../src/periphery/UniswapV3LpLocker.sol";
import {MockNonfungiblePositionManager} from "./mocks/MockNonfungiblePositionManager.sol";

contract MockFeeToken is ERC20 {
    constructor(string memory name_) ERC20(name_, name_) {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract UniswapV3LpLockerTest is Test {
    address internal constant DEV = address(0x9096437b3002DC8a14E27A421C094EfCeFD145ae);

    MockFeeToken internal token0;
    MockFeeToken internal token1;
    MockNonfungiblePositionManager internal npm;
    UniswapV3LpLocker internal locker;
    uint256 internal tokenId;

    function setUp() public {
        token0 = new MockFeeToken("T0");
        token1 = new MockFeeToken("T1");
        npm = new MockNonfungiblePositionManager(address(token0), address(token1));
        locker = new UniswapV3LpLocker(address(npm), DEV);

        vm.prank(DEV);
        tokenId = npm.mintTo(DEV);
    }

    function test_burnLP_locksForever() public {
        vm.startPrank(DEV);
        npm.approve(address(locker), tokenId);
        locker.burnLP(tokenId);
        vm.stopPrank();

        assertEq(locker.positionId(), tokenId);
        assertEq(npm.ownerOf(tokenId), address(locker));
    }

    function test_burnLP_onlyOwner() public {
        address stranger = address(0xBEEF);
        vm.prank(DEV);
        npm.transferFrom(DEV, stranger, tokenId);

        vm.startPrank(stranger);
        npm.approve(address(locker), tokenId);
        vm.expectRevert(UniswapV3LpLocker.NotOwner.selector);
        locker.burnLP(tokenId);
        vm.stopPrank();
    }

    function test_burnLP_once() public {
        vm.startPrank(DEV);
        npm.approve(address(locker), tokenId);
        locker.burnLP(tokenId);

        uint256 second = npm.mintTo(DEV);
        npm.approve(address(locker), second);
        vm.expectRevert(UniswapV3LpLocker.AlreadyLocked.selector);
        locker.burnLP(second);
        vm.stopPrank();
    }

    function test_safeClaim_onlyOwner_toOwner() public {
        vm.startPrank(DEV);
        npm.approve(address(locker), tokenId);
        locker.burnLP(tokenId);
        vm.stopPrank();

        token0.mint(address(npm), 10 ether);
        token1.mint(address(npm), 3 ether);

        vm.prank(address(0xBEEF));
        vm.expectRevert(UniswapV3LpLocker.NotOwner.selector);
        locker.safeClaim();

        uint256 b0 = token0.balanceOf(DEV);
        uint256 b1 = token1.balanceOf(DEV);

        vm.prank(DEV);
        (uint256 a0, uint256 a1) = locker.safeClaim();

        assertEq(a0, 10 ether);
        assertEq(a1, 3 ether);
        assertEq(token0.balanceOf(DEV), b0 + 10 ether);
        assertEq(token1.balanceOf(DEV), b1 + 3 ether);
        assertEq(npm.ownerOf(tokenId), address(locker));
    }

    function test_safeClaim_requiresLock() public {
        vm.prank(DEV);
        vm.expectRevert(UniswapV3LpLocker.NothingLocked.selector);
        locker.safeClaim();
    }
}
