// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal Uniswap V2 pair mock that reproduces the real pair's
///         cumulative-price accumulation in `_update`, so the TWAP oracle can be
///         tested faithfully (including flash-manipulation scenarios).
contract MockUniswapV2Pair {
    uint256 private constant Q112 = 2 ** 112;

    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;

    constructor(address t0, address t1, uint112 r0, uint112 r1) {
        token0 = t0;
        token1 = t1;
        reserve0 = r0;
        reserve1 = r1;
        blockTimestampLast = uint32(block.timestamp % 2 ** 32);
    }

    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }

    /// @notice Set new reserves, accumulating the OLD price over the elapsed time
    ///         (exactly like Uniswap V2's `_update`).
    function setReserves(uint112 r0, uint112 r1) external {
        _update(r0, r1);
    }

    function _update(uint112 r0, uint112 r1) internal {
        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
        uint32 timeElapsed;
        unchecked {
            timeElapsed = blockTimestamp - blockTimestampLast;
        }
        if (timeElapsed > 0 && reserve0 != 0 && reserve1 != 0) {
            // forge-lint: disable-next-line(divide-before-multiply)
            price0CumulativeLast += ((uint256(reserve1) * Q112) / reserve0) * timeElapsed;
            // forge-lint: disable-next-line(divide-before-multiply)
            price1CumulativeLast += ((uint256(reserve0) * Q112) / reserve1) * timeElapsed;
        }
        reserve0 = r0;
        reserve1 = r1;
        blockTimestampLast = blockTimestamp;
    }

    function sync() external {}
}
