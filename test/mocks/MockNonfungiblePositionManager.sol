// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {INonfungiblePositionManager} from "../../src/interfaces/IUniswapV3.sol";

/// @dev Minimal NPM stub: ERC-721 positions + fee collect that forwards mock balances.
contract MockNonfungiblePositionManager is ERC721 {
    uint256 public nextId = 1;
    address public token0;
    address public token1;

    constructor(address token0_, address token1_) ERC721("Mock Uni V3 Positions", "MUNI-V3") {
        token0 = token0_;
        token1 = token1_;
    }

    function mintTo(address to) external returns (uint256 tokenId) {
        tokenId = nextId++;
        _mint(to, tokenId);
    }

    function collect(INonfungiblePositionManager.CollectParams calldata params)
        external
        payable
        returns (uint256 amount0, uint256 amount1)
    {
        require(ownerOf(params.tokenId) == msg.sender, "not owner");
        amount0 = IERC20(token0).balanceOf(address(this));
        amount1 = IERC20(token1).balanceOf(address(this));
        if (amount0 > params.amount0Max) amount0 = params.amount0Max;
        if (amount1 > params.amount1Max) amount1 = params.amount1Max;
        if (amount0 > 0) IERC20(token0).transfer(params.recipient, amount0);
        if (amount1 > 0) IERC20(token1).transfer(params.recipient, amount1);
    }
}
