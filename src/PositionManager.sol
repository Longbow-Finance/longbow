// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/*//////////////////////////////////////////////////////////////////////////////
                                    LONGBOW
                 The leverage layer for $LONG on Robinhood Chain

    Website   https://longbowfi.xyz
    X         https://x.com/longbowfi
    GitHub    https://github.com/Longbow-Finance
//////////////////////////////////////////////////////////////////////////////*/

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

import {IPriceOracle} from "./interfaces/IPriceOracle.sol";
import {ILiquiditySink} from "./interfaces/ILiquiditySink.sol";

/// @title PositionManager
/// @notice The Longbow "position contract". Users deposit ETH as collateral and
///         open a leveraged long on LONG. They receive no tokens up front; instead
///         they accrue *reward tokens* (paid from a finite reserve) as the price
///         rises. On exit the payoff is a smooth leveraged long: the ETH returned
///         equals the position's current equity (capped at the initial deposit),
///         so a profitable exit returns the full deposit plus reward tokens while
///         an underwater exit returns less ETH and donates the shortfall to the
///         pool. If the price falls far enough the position is liquidated: the
///         reward is forfeited and the remaining ETH collateral is donated
///         permanently to the liquidity pool. Short positions are not supported.
///
/// @dev PRICE CONVENTION: `oracle.priceWad()` returns ETH per LONG as a WAD.
///
/// @dev SOLVENCY (the important invariant): a position's lifetime token payout is
///      `reward(P) = maxReward * (P - P0) / P` for `P >= P0`, which is strictly
///      bounded above by `maxReward = collateral * m / P0` (the limit as P -> inf).
///      At open time we "earmark" exactly `maxReward` tokens from the reserve and
///      refuse the open unless the unearmarked reserve can cover it. Therefore
///      `totalEarmarked <= reserveBalance()` always holds, and the sum of all
///      payouts can never exceed the reserve. No global loops, no dilution of
///      existing positions.
contract PositionManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    uint256 internal constant WAD = 1e18;
    uint256 internal constant BPS = 1e4;

    struct Position {
        address owner; // slot 0: 160 bits
        uint96 multiplierWad; // slot 0: leverage, WAD (1e18 == 1x)
        uint128 collateral; // slot 1: ETH deposited, in wei
        uint128 earmark; // slot 1: LONG tokens reserved for this position's max payout
        uint256 entryPriceWad; // slot 2: ETH per LONG at open, WAD
        bool open; // slot 3
    }

    /// @notice The LONG reward token. This contract's balance is the reward reserve.
    IERC20 public immutable long;

    /// @notice Price oracle (ETH per LONG, WAD). Pluggable / owner-updatable.
    IPriceOracle public oracle;

    /// @notice Destination for forfeited collateral on liquidation.
    ILiquiditySink public liquiditySink;

    /// @notice Maximum allowed multiplier, WAD. Minimum is fixed at 1x (1e18).
    uint256 public maxMultiplierWad;

    /// @notice Maintenance margin as a fraction of collateral, in bps. A position
    ///         is liquidatable once its equity falls to/below this fraction of the
    ///         deposited collateral. The remaining buffer covers the keeper bounty.
    uint256 public maintenanceMarginBps;

    /// @notice Keeper reward on liquidation, in bps of the position's collateral.
    uint256 public liquidationBountyBps;

    /// @notice Minimum ETH collateral to open a position (dust / griefing guard).
    uint256 public minCollateral;

    /// @notice Total LONG tokens earmarked across all open positions.
    uint256 public totalEarmarked;

    uint256 public nextPositionId;
    mapping(uint256 => Position) public positions;

    event OracleUpdated(address indexed oracle);
    event LiquiditySinkUpdated(address indexed sink);
    event ParamsUpdated(
        uint256 maxMultiplierWad, uint256 maintenanceMarginBps, uint256 liquidationBountyBps, uint256 minCollateral
    );
    event PositionOpened(
        uint256 indexed id,
        address indexed owner,
        uint256 collateral,
        uint256 multiplierWad,
        uint256 entryPriceWad,
        uint256 earmark
    );
    event PositionClosed(
        uint256 indexed id,
        address indexed owner,
        uint256 collateralReturned,
        uint256 collateralToPool,
        uint256 rewardPaid,
        uint256 exitPriceWad
    );
    event PositionLiquidated(
        uint256 indexed id,
        address indexed owner,
        address indexed keeper,
        uint256 collateralDonated,
        uint256 keeperBounty,
        uint256 priceWad
    );

    error ZeroAddress();
    error InvalidMultiplier();
    error CollateralTooLow();
    error PriceUnavailable();
    error InsufficientReserve();
    error NotPositionOwner();
    error PositionNotOpen();
    error PositionLiquidatable();
    error PositionNotLiquidatable();
    error EthTransferFailed();

    constructor(
        address long_,
        address oracle_,
        address liquiditySink_,
        address owner_,
        uint256 maxMultiplierWad_,
        uint256 maintenanceMarginBps_,
        uint256 liquidationBountyBps_,
        uint256 minCollateral_
    ) Ownable(owner_) {
        if (long_ == address(0) || oracle_ == address(0) || liquiditySink_ == address(0)) {
            revert ZeroAddress();
        }
        long = IERC20(long_);
        oracle = IPriceOracle(oracle_);
        liquiditySink = ILiquiditySink(liquiditySink_);
        _setParams(maxMultiplierWad_, maintenanceMarginBps_, liquidationBountyBps_, minCollateral_);
    }

    // -------------------------------------------------------------------------
    // User actions
    // -------------------------------------------------------------------------

    /// @notice Open a leveraged long by depositing ETH collateral.
    /// @param multiplierWad Desired leverage, WAD. Must be within [1e18, maxMultiplierWad].
    /// @return id The new position id.
    function openPosition(uint256 multiplierWad) external payable nonReentrant returns (uint256 id) {
        if (multiplierWad < WAD || multiplierWad > maxMultiplierWad) revert InvalidMultiplier();
        if (msg.value < minCollateral) revert CollateralTooLow();

        uint256 price = _price();

        // maxReward = collateral * m / P0  (token base units)
        uint256 earmark = Math.mulDiv(msg.value, multiplierWad, price);
        if (earmark > availableReserve()) revert InsufficientReserve();

        totalEarmarked += earmark;

        id = nextPositionId++;
        positions[id] = Position({
            owner: msg.sender,
            multiplierWad: multiplierWad.toUint96(),
            collateral: msg.value.toUint128(),
            earmark: earmark.toUint128(),
            entryPriceWad: price,
            open: true
        });

        emit PositionOpened(id, msg.sender, msg.value, multiplierWad, price, earmark);
    }

    /// @notice Close your own position while it is healthy.
    /// @dev Smooth partial-loss payoff:
    ///      - ETH returned = position equity, clamped to [0, collateral]. When in
    ///        profit the ETH leg is capped at the initial deposit (the upside is
    ///        the token reward); when underwater you get back less than you put in.
    ///      - The ETH shortfall (collateral - returned) is donated to the pool
    ///        immediately, so losses feed liquidity continuously.
    ///      - Reward tokens (only above entry) are paid from the reserve, unchanged.
    function closePosition(uint256 id) external nonReentrant {
        Position storage p = positions[id];
        if (!p.open) revert PositionNotOpen();
        if (p.owner != msg.sender) revert NotPositionOwner();

        uint256 price = _price();
        if (_isLiquidatable(p, price)) revert PositionLiquidatable();

        uint256 reward = _pendingReward(p, price);
        uint256 collateral = p.collateral;
        uint256 equity = _equity(p, price);
        uint256 ethReturn = equity > collateral ? collateral : equity;
        uint256 toPool = collateral - ethReturn;
        address owner_ = p.owner;

        // Effects: free the earmark and close before any external interaction.
        totalEarmarked -= p.earmark;
        p.open = false;

        // Interactions.
        if (reward > 0) long.safeTransfer(owner_, reward);
        if (ethReturn > 0) _sendEth(owner_, ethReturn);
        if (toPool > 0) liquiditySink.donate{value: toPool}();

        emit PositionClosed(id, owner_, ethReturn, toPool, reward, price);
    }

    /// @notice Liquidate an unhealthy position. Callable by anyone. The caller
    ///         receives a bounty in ETH; the remaining collateral is donated to
    ///         the liquidity sink. The position's reward is forfeited.
    function liquidate(uint256 id) external nonReentrant {
        Position storage p = positions[id];
        if (!p.open) revert PositionNotOpen();

        uint256 price = _price();
        if (!_isLiquidatable(p, price)) revert PositionNotLiquidatable();

        uint256 collateral = p.collateral;
        uint256 bounty = Math.mulDiv(collateral, liquidationBountyBps, BPS);
        uint256 donation = collateral - bounty;
        address owner_ = p.owner;

        // Effects.
        totalEarmarked -= p.earmark;
        p.open = false;

        // Interactions.
        if (bounty > 0) _sendEth(msg.sender, bounty);
        if (donation > 0) liquiditySink.donate{value: donation}();

        emit PositionLiquidated(id, owner_, msg.sender, donation, bounty, price);
    }

    // -------------------------------------------------------------------------
    // Views
    // -------------------------------------------------------------------------

    /// @notice LONG tokens currently held as reward reserve.
    function reserveBalance() public view returns (uint256) {
        return long.balanceOf(address(this));
    }

    /// @notice Reserve tokens not yet earmarked to an open position.
    function availableReserve() public view returns (uint256) {
        uint256 bal = reserveBalance();
        return bal > totalEarmarked ? bal - totalEarmarked : 0;
    }

    /// @notice Reward tokens a position can currently claim on exit.
    function pendingReward(uint256 id) external view returns (uint256) {
        Position storage p = positions[id];
        if (!p.open) return 0;
        return _pendingReward(p, _price());
    }

    /// @notice Current mark-to-market equity of a position, in wei of ETH.
    function positionEquity(uint256 id) external view returns (uint256) {
        Position storage p = positions[id];
        if (!p.open) return 0;
        return _equity(p, _price());
    }

    /// @notice Price (ETH per LONG, WAD) at or below which the position is liquidatable.
    function liquidationPrice(uint256 id) public view returns (uint256) {
        Position storage p = positions[id];
        if (!p.open) return 0;
        return _liquidationPrice(p.entryPriceWad, p.multiplierWad);
    }

    /// @notice Whether the position can be liquidated right now.
    function isLiquidatable(uint256 id) external view returns (bool) {
        Position storage p = positions[id];
        if (!p.open) return false;
        return _isLiquidatable(p, _price());
    }

    function getPosition(uint256 id) external view returns (Position memory) {
        return positions[id];
    }

    // -------------------------------------------------------------------------
    // Internal math
    // -------------------------------------------------------------------------

    function _price() internal view returns (uint256 price) {
        price = oracle.priceWad();
        if (price == 0) revert PriceUnavailable();
    }

    /// @dev reward = maxReward * (P - P0) / P, floored at 0. Strictly < earmark.
    function _pendingReward(Position storage p, uint256 price) internal view returns (uint256) {
        uint256 entry = p.entryPriceWad;
        if (price <= entry) return 0;
        return Math.mulDiv(p.earmark, price - entry, price);
    }

    /// @dev equity = collateral * (1 + m * (P - P0) / P0), floored at 0 (wei).
    function _equity(Position storage p, uint256 price) internal view returns (uint256) {
        uint256 collateral = p.collateral;
        uint256 entry = p.entryPriceWad;
        uint256 m = p.multiplierWad;
        if (price >= entry) {
            uint256 gain = Math.mulDiv(collateral, m * (price - entry), WAD * entry);
            return collateral + gain;
        } else {
            uint256 loss = Math.mulDiv(collateral, m * (entry - price), WAD * entry);
            return collateral > loss ? collateral - loss : 0;
        }
    }

    function _isLiquidatable(Position storage p, uint256 price) internal view returns (bool) {
        uint256 maintenance = Math.mulDiv(p.collateral, maintenanceMarginBps, BPS);
        return _equity(p, price) <= maintenance;
    }

    /// @dev P_liq = P0 * (1 - (1 - mm) / m), where mm = maintenanceMarginBps / 1e4.
    function _liquidationPrice(uint256 entry, uint256 m) internal view returns (uint256) {
        uint256 mmWad = Math.mulDiv(maintenanceMarginBps, WAD, BPS); // mm in WAD
        uint256 oneMinusMm = WAD - mmWad; // (1 - mm), WAD
        uint256 term = Math.mulDiv(oneMinusMm, WAD, m); // (1 - mm)/m, WAD
        if (term >= WAD) return 0; // only possible if m < (1 - mm); disallowed since m >= 1
        uint256 factor = WAD - term; // (1 - (1-mm)/m), WAD
        return Math.mulDiv(entry, factor, WAD);
    }

    function _sendEth(address to, uint256 amount) internal {
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert EthTransferFailed();
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setOracle(address oracle_) external onlyOwner {
        if (oracle_ == address(0)) revert ZeroAddress();
        oracle = IPriceOracle(oracle_);
        emit OracleUpdated(oracle_);
    }

    function setLiquiditySink(address sink_) external onlyOwner {
        if (sink_ == address(0)) revert ZeroAddress();
        liquiditySink = ILiquiditySink(sink_);
        emit LiquiditySinkUpdated(sink_);
    }

    function setParams(
        uint256 maxMultiplierWad_,
        uint256 maintenanceMarginBps_,
        uint256 liquidationBountyBps_,
        uint256 minCollateral_
    ) external onlyOwner {
        _setParams(maxMultiplierWad_, maintenanceMarginBps_, liquidationBountyBps_, minCollateral_);
    }

    function _setParams(
        uint256 maxMultiplierWad_,
        uint256 maintenanceMarginBps_,
        uint256 liquidationBountyBps_,
        uint256 minCollateral_
    ) internal {
        require(maxMultiplierWad_ >= WAD, "max mult < 1x");
        require(maxMultiplierWad_ <= type(uint96).max, "max mult too large");
        // Maintenance margin + bounty must leave headroom below full collateral.
        require(maintenanceMarginBps_ < BPS, "mm >= 100%");
        require(liquidationBountyBps_ <= maintenanceMarginBps_, "bounty > mm");
        maxMultiplierWad = maxMultiplierWad_;
        maintenanceMarginBps = maintenanceMarginBps_;
        liquidationBountyBps = liquidationBountyBps_;
        minCollateral = minCollateral_;
        emit ParamsUpdated(maxMultiplierWad_, maintenanceMarginBps_, liquidationBountyBps_, minCollateral_);
    }
}
