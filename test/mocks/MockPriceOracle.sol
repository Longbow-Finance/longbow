// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IPriceOracle} from "../../src/interfaces/IPriceOracle.sol";

/// @notice Test-only oracle with a settable price (ETH per LONG, WAD).
contract MockPriceOracle is IPriceOracle {
    uint256 private _price;

    constructor(uint256 initialPrice) {
        _price = initialPrice;
    }

    function setPrice(uint256 price) external {
        _price = price;
    }

    function priceWad() external view returns (uint256) {
        return _price;
    }
}
