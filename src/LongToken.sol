// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/*//////////////////////////////////////////////////////////////////////////////
                                    LONGBOW
                 The leverage layer for $LONG on Robinhood Chain

    Website   https://longbowfi.xyz
    X         https://x.com/longbowfi
    GitHub    https://github.com/Longbow-Finance
//////////////////////////////////////////////////////////////////////////////*/

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title LongToken (LONG)
/// @notice Fixed-supply ERC-20 for the Longbow protocol. The entire supply is
///         minted once, at deployment, to the deployer. The deployment script is
///         responsible for the intended 50/50 split: half seeds the DEX liquidity
///         pool and half is transferred to the PositionManager to serve as the
///         reward reserve. No further tokens can ever be minted.
contract LongToken is ERC20, ERC20Permit {
    /// @param initialSupply Total fixed supply, in token base units (18 decimals).
    /// @param recipient     Address that receives the full supply at genesis
    ///                       (the deployer, which then distributes per the plan).
    constructor(uint256 initialSupply, address recipient) ERC20("Longbow", "LONG") ERC20Permit("Longbow") {
        require(recipient != address(0), "LONG: zero recipient");
        require(initialSupply > 0, "LONG: zero supply");
        _mint(recipient, initialSupply);
    }
}
