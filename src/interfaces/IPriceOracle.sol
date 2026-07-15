// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IPriceOracle
/// @notice Returns the price of one LONG token denominated in ETH, as a WAD
///         (18-decimal fixed point). A value of 1e18 means 1 LONG == 1 ETH.
/// @dev    Implementations MUST be resistant to single-block/flash-loan
///         manipulation (e.g. a TWAP), because this price gates liquidations.
interface IPriceOracle {
    /// @return priceWad ETH per LONG, scaled by 1e18. Never returns 0 for a
    ///         healthy pool; callers treat 0 as "price unavailable".
    function priceWad() external view returns (uint256 priceWad);
}
