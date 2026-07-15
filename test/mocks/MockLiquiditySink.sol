// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ILiquiditySink} from "../../src/interfaces/ILiquiditySink.sol";

/// @notice Test-only sink that simply records the total ETH donated to it.
contract MockLiquiditySink is ILiquiditySink {
    uint256 public totalDonated;

    function donate() external payable {
        totalDonated += msg.value;
    }

    receive() external payable {
        totalDonated += msg.value;
    }
}
