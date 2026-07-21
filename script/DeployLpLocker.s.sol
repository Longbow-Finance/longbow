// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";

import {UniswapV3LpLocker} from "../src/periphery/UniswapV3LpLocker.sol";

/// @notice Deploys only `UniswapV3LpLocker`.
///
/// Env:
///   PRIVATE_KEY                  deployer key (gas)
///   UNISWAP_V3_POSITION_MANAGER  Uniswap V3 NPM (default: Robinhood mainnet)
///   LP_LOCKER_OWNER              immutable owner / fee recipient
contract DeployLpLocker is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        address npm = vm.envOr("UNISWAP_V3_POSITION_MANAGER", address(0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3));
        address owner = vm.envOr("LP_LOCKER_OWNER", address(0x9096437b3002DC8a14E27A421C094EfCeFD145ae));

        console2.log("deployer", deployer);
        console2.log("npm", npm);
        console2.log("owner", owner);

        vm.startBroadcast(pk);
        UniswapV3LpLocker locker = new UniswapV3LpLocker(npm, owner);
        vm.stopBroadcast();

        console2.log("UniswapV3LpLocker", address(locker));
    }
}
