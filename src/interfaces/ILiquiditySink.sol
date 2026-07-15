// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title ILiquiditySink
/// @notice Destination for forfeited collateral when a "long" position is
///         liquidated. The ETH sent here is permanently contributed toward the
///         token's liquidity (it can never be pulled back out by the depositor),
///         matching Longbow's rule that a liquidated deposit forever supports the
///         liquidity pool.
interface ILiquiditySink {
    /// @notice Receive `msg.value` ETH and route it toward protocol liquidity.
    function donate() external payable;
}
