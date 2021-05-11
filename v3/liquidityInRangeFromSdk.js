const { BigintIsh, MaxUint256, Percent, Price, CurrencyAmount, Token } = require('@uniswap/sdk-core');
const uniswapsdk = require('@uniswap/v3-sdk');
const JSBI = require('jsbi');
const ZERO = JSBI.BigInt(0);
const api = require('./apiv3Queries.js');
const helpers = require('../helpers.js');



function amount0(token0, tickCurrent, tickLower, tickUpper, liquidity, sqrtRatioX96) {
    if (tickCurrent < tickLower) {
        return new CurrencyAmount(
            token0,
            uniswapsdk.SqrtPriceMath.getAmount0Delta(
                uniswapsdk.TickMath.getSqrtRatioAtTick(tickLower),
                uniswapsdk.TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity,
                false
            )
        )
    } else if (tickCurrent < tickUpper) {
        return new CurrencyAmount(
            token0,
            uniswapsdk.SqrtPriceMath.getAmount0Delta(
                sqrtRatioX96,
                uniswapsdk.TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity,
                false
            )
        )
    }
    return new CurrencyAmount(token0, ZERO)
}

function amount1(token1, tickCurrent, tickLower, tickUpper, liquidity, sqrtRatioX96) {
    if (tickCurrent < tickLower) {
        return new CurrencyAmount(token1, ZERO)
    } else if (tickCurrent < tickUpper) {
        return new CurrencyAmount(
            token1,
            uniswapsdk.SqrtPriceMath.getAmount1Delta(
                uniswapsdk.TickMath.getSqrtRatioAtTick(tickLower),
                sqrtRatioX96,
                liquidity,
                false
            )
        )
    } else {

            return new CurrencyAmount(
                token1,
                uniswapsdk.SqrtPriceMath.getAmount1Delta(
                    uniswapsdk.TickMath.getSqrtRatioAtTick(tickLower),
                    uniswapsdk.TickMath.getSqrtRatioAtTick(tickUpper),
                    liquidity,
                    false
                )
            )


    }
}

const _getTickForPrice = (n, base = 1.0001) => {
    let res = (Math.log(n) / Math.log(base));


    return Number((res.toFixed(0)/10).toFixed(0)*10);

};
const _getPriceForTick = (n) => (Math.pow(1.0001, n));

function getIntersectingMints(pool, minPrice, maxPrice) {
    const tickLower = Number(_getTickForPrice(minPrice));
    const tickUpper = Number(_getTickForPrice(maxPrice));

    const mints = [];
    pool.mints.forEach((m) => {
        if(helpers.rangeIntersection([tickLower, tickUpper],[m.tickLower, m.tickUpper])) {
            mints.push(m);
        }
    });

    return mints;
}

function getLiquidityForMint(pool, mint) {
    const addressToken0 = pool.token0.id;
    const addressToken1 = pool.token1.id;
    const sqrtPrice = Number(pool.sqrtPrice);
    const currentTick  = Number(pool.tick);
    const rate = 1/_getPriceForTick(currentTick);

    const tickLower = mint.tickLower;
    const tickUpper = mint.tickUpper;


    const token0 = new Token(1, addressToken0, 18, pool.token0.symbol, pool.token0.name);
    const amount0Token0 = amount0(token0, currentTick, Number(Number(mint.tickLower).toFixed(0)), Number(Number(mint.tickUpper).toFixed(0)), JSBI.BigInt(mint.amount), JSBI.BigInt(sqrtPrice));

    const token1 = new Token(1, addressToken1, 18, pool.token1.symbol, pool.token1.name);
    const amount1Token1 = amount1(token1, currentTick, Number(Number(mint.tickLower).toFixed(0)), Number(Number(mint.tickUpper).toFixed(0)), JSBI.BigInt(mint.amount), JSBI.BigInt(sqrtPrice));

    const t0 = Number(amount0Token0.toSignificant(4));
    const t1 = Number(amount1Token1.toSignificant(4));

    const ethAmount = Number(t0) + Number(t1) * rate;

    return ({
        t0,
        t1,
    });
}

function getLiquidityInRange(pool, minPrice, maxPrice) {
    const mints = getIntersectingMints(pool, minPrice, maxPrice);
    let t0Amout = 0;
    let t1Amount = 0;
    mints.forEach((m) => {
        const amounts = getLiquidityForMint(pool, m);
        t0Amout += amounts.t0;
        t1Amount += amounts.t1;
    });

    return {
        t0Amout,
        t1Amount,
    };
}

// function getLiquidityInRange(pool, minPrice, maxPrice, etrUsdPool) {
//     const addressToken0 = pool.token0.id;
//     const addressToken1 = pool.token1.id;
//     const liquidity = Number(pool.liquidity);
//     const sqrtPrice = Number(pool.sqrtPrice);
//     const currentTick  = Number(pool.tick);
//     const rate = 1/_getPriceForTick(currentTick);
//     const etrUsdcRate = _getPriceForTick(Number(etrUsdPool.tick));
//     const tickLower = _getTickForPrice(minPrice);
//     const tickUpper = _getTickForPrice(maxPrice);
//     let mint = {};
//     pool.mints.forEach((m) => {
//         if(m.tickLower == tickLower && m.tickUpper == tickUpper) {
//             mint = m;
//         }
//     });
//
//     const token0 = new Token(1, addressToken0, 18, pool.token0.symbol, pool.token0.name);
//     const amount0Token0 = amount0(token0, currentTick, Number(Number(mint.tickLower).toFixed(0)), Number(Number(mint.tickUpper).toFixed(0)), JSBI.BigInt(mint.amount), JSBI.BigInt(sqrtPrice));
//
//     const token1 = new Token(1, addressToken1, 18, pool.token1.symbol, pool.token1.name);
//     const amount1Token1 = amount1(token1, currentTick, Number(Number(mint.tickLower).toFixed(0)), Number(Number(mint.tickUpper).toFixed(0)), JSBI.BigInt(mint.amount), JSBI.BigInt(sqrtPrice));
//
//     const t0 = Number(amount0Token0.toSignificant(4));
//     const t1 = Number(amount1Token1.toSignificant(4));
//
//     const etrAmount = Number(t0) + Number(t1) * rate;
//     const usdAmount = etrAmount * etrUsdcRate;
//
//     return ({
//         'ETR': etrAmount,
//         // 'USD': usdAmount,
//     });
// }

async function getLiquidityInRangeforPoolId(poolId, min, max) {
    const etrUsdtPoolId = '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36';
    const etrUsdcPool = await api.getPoolByPoolId(etrUsdtPoolId);
    const pool = await api.getPoolByPoolId(poolId);

    return getLiquidityInRange(pool[0], min, max, etrUsdcPool[0]);
}

// async function main() {
//     const poolId = '0x5116f278d095ec2ad3a14090fedb3e499b8b5af6';
//     const etrUsdtPoolId = '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36';
//     const etrUsdcPool = await api.getPoolByPoolId(etrUsdtPoolId);
//
//     const pool = await api.getPoolByPoolId(poolId);
//     const liquidity = getLiquidityInRange(pool[0], 1260, 8000, etrUsdcPool[0]);
//
//     console.log(JSON.stringify(liquidity));
//
// }
//
// main()

module.exports = {getLiquidityInRangeforPoolId};
