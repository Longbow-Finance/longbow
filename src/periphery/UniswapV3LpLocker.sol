// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/*//////////////////////////////////////////////////////////////////////////////
                                    LONGBOW
                 The leverage layer for $LONG on Robinhood Chain

    Website   https://longbowfi.xyz
    X         https://x.com/longbowfi
    GitHub    https://github.com/Longbow-Finance
//////////////////////////////////////////////////////////////////////////////*/

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {INonfungiblePositionManager} from "../interfaces/IUniswapV3.sol";

/// @title UniswapV3LpLocker
/// @notice Permanently locks a Uniswap V3 position NFT. Only the owner may lock
///         and claim fees; principal liquidity can never leave.
contract UniswapV3LpLocker {
    address public immutable owner;
    INonfungiblePositionManager public immutable positionManager;

    uint256 public positionId;

    error NotOwner();
    error ZeroAddress();
    error AlreadyLocked();
    error NothingLocked();
    error BadToken();

    event Locked(uint256 indexed tokenId);
    event Claimed(uint256 amount0, uint256 amount1);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address positionManager_, address owner_) {
        if (positionManager_ == address(0) || owner_ == address(0)) revert ZeroAddress();
        positionManager = INonfungiblePositionManager(positionManager_);
        owner = owner_;
    }

    function burnLP(uint256 tokenId) external onlyOwner {
        if (positionId != 0) revert AlreadyLocked();
        if (tokenId == 0) revert BadToken();

        IERC721(address(positionManager)).transferFrom(msg.sender, address(this), tokenId);
        positionId = tokenId;
        emit Locked(tokenId);
    }

    function safeClaim() external onlyOwner returns (uint256 amount0, uint256 amount1) {
        uint256 id = positionId;
        if (id == 0) revert NothingLocked();

        (amount0, amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: id,
                recipient: owner,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
        emit Claimed(amount0, amount1);
    }
}
