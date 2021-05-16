
const { BigintIsh, MaxUint256, Percent, Price, CurrencyAmount, ChainId, Token } = require('@uniswap/sdk-core');
const uniswapsdk = require('@uniswap/v3-sdk');
const JSBI = require('jsbi');
const ZERO = JSBI.BigInt(0);
const api = require('./apiv3Queries.js');
const helpers = require('../helpers.js');
const { log } = require('mathjs');
const consts = require('./consts.js');




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
    let res = log(n, base);

    return Number((res.toFixed(0)/10).toFixed(0)*10);

};
const getPriceForTick2 = (n) => (Math.pow(1.0001, n));

const getPriceForTick = (pool, tick) => {
    const token0 = new Token(1, pool.token0.id, parseInt(pool.token0.decimals), pool.token0.symbol, pool.token0.name);
    const token1 = new Token(1, pool.token1.id, parseInt(pool.token1.decimals), pool.token1.symbol, pool.token1.name);
    let tickPrice = uniswapsdk.tickToPrice(token0, token1, Number(tick));
    if (Number(tickPrice.toFixed(4)) == 0) {
        tickPrice = uniswapsdk.tickToPrice(token1, token0, Number(tick));
    }

    return Number( tickPrice.toFixed(4) );
};

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
    // TODO check prieForTick
    // const rate = currentTick < 0 ? getPriceForTick(currentTick): 1 / getPriceForTick(currentTick);
    const rate = getPriceForTick(pool, currentTick);

    const tickLower = mint.tickLower;
    const tickUpper = mint.tickUpper;


    const token0 = new Token(1, addressToken0, 18, pool.token0.symbol, pool.token0.name);
    const amount0Token0 = amount0(token0, currentTick, Number(Number(mint.tickLower).toFixed(0)), Number(Number(mint.tickUpper).toFixed(0)), JSBI.BigInt(mint.amount), JSBI.BigInt(sqrtPrice));

    const token1 = new Token(1, addressToken1, 18, pool.token1.symbol, pool.token1.name);
    const amount1Token1 = amount1(token1, currentTick, Number(Number(mint.tickLower).toFixed(0)), Number(Number(mint.tickUpper).toFixed(0)), JSBI.BigInt(mint.amount), JSBI.BigInt(sqrtPrice));

    let t0 = Number(amount0Token0.toSignificant(4));
    let t1 = Number(amount1Token1.toSignificant(4));

    if(!consts.ETH_SYM.includes( amount0Token0.currency.Symbol ) )  {
        t0 = Number(amount1Token1.toSignificant(4));
        t1 = Number(amount0Token0.toSignificant(4));
    }

    const ethAmount = Number(t0) + Number(t1) * rate;

    return ({
        t0,
        t1,
        ethAmount,
    });
}

function _isActiveMint(mint, pool) {

    let isLowerMintTickFound = false;
    let isUpperMintTickFound = false;

    pool.ticks.forEach((tick) => {
        if(tick.tickIdx == mint.tickLower) {
            isLowerMintTickFound = true;
        } else if(tick.tickIdx == mint.tickUpper) {
            isUpperMintTickFound = true;
        }
    });

    if (!(isLowerMintTickFound && isUpperMintTickFound)) {
        return false;
    }

    return true;
}

function getLiquidityInRange(pool, minPrice, maxPrice) {
    const mints = getIntersectingMints(pool, minPrice, maxPrice);
    let t0Amout = 0;
    let t1Amount = 0;
    let ethAmount = 0;
    mints.forEach((m) => {
        if(_isActiveMint(m, pool)) {
            const amounts = getLiquidityForMint(pool, m);
            t0Amout += amounts.t0;
            t1Amount += amounts.t1;
            ethAmount += amounts.ethAmount;
        }

    });

    return {
        t0Amout,
        t1Amount,
        ethAmount,
    };
}

function _getLiquidityForTick(pool, tick) {
    const addressToken0 = tick.addressToken0;
    const addressToken1 = tick.addressToken1;;
    const sqrtPrice = Number(tick.sqrtPrice);
    const currentTick  = Number(tick.currentTick);
    const rate = tick.rate;

    const tickLower = tick.tickLower;
    const tickUpper = tick.tickUpper;


    const token0 = new Token(1, addressToken0, 18, pool.token0.symbol, pool.token0.name);
    const amount0Token0 = amount0(token0, currentTick, Number(Number(tickLower).toFixed(0)), Number(Number(tickUpper).toFixed(0)), JSBI.BigInt(tick.liquidity), JSBI.BigInt(sqrtPrice));

    const token1 = new Token(1, addressToken1, 18, pool.token1.symbol, pool.token1.name);
    const amount1Token1 = amount1(token1, currentTick, Number(Number(tickLower).toFixed(0)), Number(Number(tickUpper).toFixed(0)), JSBI.BigInt(tick.liquidity), JSBI.BigInt(sqrtPrice));

    let t0 = Number(amount0Token0.toSignificant(4));
    let t1 = Number(amount1Token1.toSignificant(4));

    if(consts.ETH_SYM.includes( amount0Token0.currency.Symbol ) )  {
        t0 = Number(amount1Token1.toSignificant(4));
        t1 = Number(amount0Token0.toSignificant(4));
    }

    const ethAmount = Number(t0) + Number(t1) * rate;

    return ({
        t0,
        t1,
        ethAmount,
    });
}

function _getLiquidityForAllRange(liquidityList, pool) {
    let t0 = 0;
    let t1 = 0;
    let ethAmount = 0;
    liquidityList.forEach((entry) =>{
        entry.rate = getPriceForTick(pool, pool.tick);
        const liquidity = _getLiquidityForTick(pool, entry);
        t0 += liquidity.t0;
        t1 += liquidity.t1;
        ethAmount+= liquidity.ethAmount;

    });

    return {
        t0,
        t1,
        ethAmount,
    };
}

function _getLiquidityForRange(liquidityList, minPrice, maxPrice, pool) {
    const minPriceTick = _getTickForPrice(minPrice);
    const maxPriceTick = _getTickForPrice(maxPrice);
    let t0 = 0;
    let t1 = 0;
    let ethAmount = 0;
    const res = [];
    liquidityList.forEach((entry) =>{
        if(helpers.rangeIntersection([minPriceTick, maxPriceTick],[entry.tickLower, entry.tickUpper])){
            // TODO check priceForTick
            const liquidity = _getLiquidityForTick(pool[0], entry);
            // const minTickPrice = getPriceForTick(entry.tickLower);
            const minTickPrice = getPriceForTick(pool, entry.tickLower);
            // const maxTickPrice = getPriceForTick(entry.tickUpper);
            const maxTickPrice = getPriceForTick(pool, entry.tickUpper);
            res.push({
                t0: liquidity.t0,
                t0Avg: liquidity.t0 / (maxTickPrice - minTickPrice),
                t1: liquidity.t1,
                t1Avg: liquidity.t1 / (maxTickPrice - minTickPrice),
                ethAmount: liquidity.ethAmount,
                ethAvg: liquidity.ethAmount / (maxTickPrice - minTickPrice),
                minTickPrice,
                maxTickPrice,
            });
        }
    });

    return res;
}

function _getLiquidityList(pool) {
    const liquidityList = [];
    const addressToken0 = pool.token0.id;
    const addressToken1 = pool.token1.id;
    const sqrtPrice = Number(pool.sqrtPrice);
    const currentTick  = Number(pool.tick);
    // const rate = currentTick < 0 ? getPriceForTick(currentTick) : 1/getPriceForTick(currentTick);
    // TODO check priceForTick
    const rate = getPriceForTick(pool, currentTick);
    let liquidity = 0;
    let tickLower = 0;
    let tickUpper = 0;
    pool.ticks = pool.ticks.sort((a,b) => (Number(a.tickIdx) < Number(b.tickIdx) ) ? -1 : ((Number(b.tickIdx) > Number(a.tickIdx )) ? 1 : 0));

    for (let i = 0; i < pool.ticks.length - 1; i++) {
        if(i === 0) {
            liquidity = JSBI.BigInt(Number(pool.ticks[0].liquidityGross));
            tickLower = Number(pool.ticks[0].tickIdx);
            tickUpper = Number(pool.ticks[1].tickIdx);
        } else {
            liquidity = JSBI.add( JSBI.BigInt( liquidityList[i-1].liquidity ), JSBI.BigInt( Number(pool.ticks[i].liquidityNet) ) );
            tickLower = Number(pool.ticks[i].tickIdx);
            tickUpper = Number(pool.ticks[i+1].tickIdx);
        }

        liquidityList.push({
            liquidity,
            tickLower,
            tickUpper,
            addressToken0,
            addressToken1,
            sqrtPrice,
            rate,
            currentTick,
        });
    }

    return liquidityList;
}

function getAllPoolLiquidity(pool) {

    if(pool.ticks.length === 0) {
        return {
            t0: 0,
            t1: 0,
            inEth: 0,
        };
    }

    const liquidityList = _getLiquidityList(pool);

    pool.ticks = pool.ticks.sort((a,b) => (Number(a.tickIdx) < Number(b.tickIdx) ) ? -1 : ((Number(b.tickIdx) > Number(a.tickIdx )) ? 1 : 0));

    // TODO check priceForTick
    // const liquidity = _getLiquidityForRange(liquidityList, getPriceForTick(liquidityList[0].tickLower), getPriceForTick(liquidityList[liquidityList.length-1].tickUpper), [pool]);
    const liquidity = _getLiquidityForRange(liquidityList, getPriceForTick(pool, liquidityList[0].tickLower), getPriceForTick(pool, liquidityList[liquidityList.length-1].tickUpper), [pool]);

    // return getRelativeLiquidity(liquidity, getPriceForTick(liquidityList[0].tickLower), getPriceForTick(liquidityList[liquidityList.length-1].tickUpper));
    return getRelativeLiquidity(liquidity, getPriceForTick(pool, liquidityList[0].tickLower), getPriceForTick(pool, liquidityList[liquidityList.length-1].tickUpper));

    // return _getLiquidityForAllRange(liquidityList, pool);
}

function getRelativeLiquidity(liquidity, minPrice, maxPrice) {
    const res = {
        t0: 0,
        t1: 0,
        inEth: 0,
    };
    liquidity.forEach((l) => {
        if (l.minTickPrice >= minPrice && l.maxTickPrice <= maxPrice)  {
            res.t0 += l.t0;
            res.t1 += l.t1;
            res.inEth += l.ethAmount;
        } else if(l.minTickPrice >= minPrice && l.maxTickPrice >= maxPrice) {
            const length = l.maxTickPrice - maxPrice;
            res.t0 += l.t0Avg * length;
            res.t1 += l.t1Avg * length;
            res.inEth += l.ethAvg * length;
        } else if (l.minTickPrice <= minPrice && l.maxTickPrice >= maxPrice) {
            const length = l.maxTickPrice - maxPrice;
            res.t0 += l.t0Avg * length;
            res.t1 += l.t1Avg * length;
            res.inEth += l.ethAvg * length;
        } else {
            const length = maxPrice - l.maxTickPrice;
            res.t0 += l.t0Avg * length;
            res.t1 += l.t1Avg * length;
            res.inEth += l.ethAvg * length;
        }
    });

    return res;
}

async function getLiquidityInRangeFromTicks(poolId, minPrice, maxPrice) {
    // const etrUsdtPoolId = '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36';
    // const etrUsdcPool = await api.getPoolByPoolId(etrUsdtPoolId);
    const pool = await api.getPoolByPoolId(poolId);
    const liquidityList = _getLiquidityList(pool[0]);
    const liquidity = _getLiquidityForRange(liquidityList, minPrice, maxPrice, pool);
    const relativeLiquidity = getRelativeLiquidity(liquidity, minPrice, maxPrice);


    return relativeLiquidity;
}

// function getLiquidityInRange(pool, minPrice, maxPrice, etrUsdPool) {
//     const addressToken0 = pool.token0.id;
//     const addressToken1 = pool.token1.id;
//     const liquidity = Number(pool.liquidity);
//     const sqrtPrice = Number(pool.sqrtPrice);
//     const currentTick  = Number(pool.tick);
//     const rate = 1/getPriceForTick(currentTick);
//     const etrUsdcRate = getPriceForTick(Number(etrUsdPool.tick));
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

    return getLiquidityInRange(pool[0], min, max);
}

// async function main() {
//     const poolId = '0x5116f278d095ec2ad3a14090fedb3e499b8b5af6';
//     const etrUsdtPoolId = '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36';
//     const etrUsdcPool = await api.getPoolByPoolId(etrUsdtPoolId);
//
//     const pool = await api.getPoolByPoolId(poolId);
//     const liquidity = getLiquidityInRange(pool[0], 100, 8000, etrUsdcPool[0]);
//
//     console.log(JSON.stringify(liquidity));
//
// }
//
// main()

module.exports = {getLiquidityInRangeforPoolId, getLiquidityInRangeFromTicks, getAllPoolLiquidity, getPriceForTick, getPriceForTick2, getLiquidityInRange};
