const api = require('./apiv3Queries.js');
const json2xls = require('json2xls');
const fs = require('fs');
const helpers = require('../helpers.js');
const consts = require('./consts.js');
const liquidityInRangeFile = require('./liquidityInRangeFromSdk.js');
const swaps = require('./swaps.js');
const stats = require('./stats.js');
const liquidityCollector = require('./liquidityCollector.js');
const v3helpers = require('./helpers.js');


const _computePoolLiquidity = (pool, ethUsdtPool) => {
   // const liquidity = liquidityInRange.getAllPoolLiquidity(pool).inEth;
   // // TODO add to significant(4)
   // const price = liquidityInRange.getPriceForTick(ethUsdtPool.tick) * Math.pow(10, 12);
   // const ethUsdRate = ethUsdtPool.tick > 0 ? 1 / price : price;
   //
   // return liquidity * ethUsdRate;
    if (!pool.ticks || pool.ticks.length === 0) {
        return 0;
    }

    pool.ticks = pool.ticks.sort((a,b) => (Number(a.tickIdx) < Number(b.tickIdx) ) ? -1 : ((Number(b.tickIdx) > Number(a.tickIdx )) ? 1 : 0));

    const liquidity = liquidityInRangeFile.getLiquidityInRange(pool, liquidityInRangeFile.getPriceForTick(pool.ticks[0].tickIdx), liquidityInRangeFile.getPriceForTick(pool.ticks[pool.ticks.length-1].tickIdx)).ethAmount;
    const price = liquidityInRangeFile.getPriceForTick(ethUsdtPool.tick) * Math.pow(10, 12);
    const ethUsdRate = price;
    pool.ethUsdRate = ethUsdRate;

    return liquidity * ethUsdRate;
};

const getPoolLiquidityInRange = (pool, minPrice, maxPrice) => {
    const liquidity = liquidityInRangeFile.getLiquidityInRange(pool, minPrice, maxPrice).ethAmount;

    return liquidity * pool.ethUsdRate;
};

const _computeDailyVolume = (dayData) => {

    if(!dayData || dayData.length === 0) {
        return 0;
    }

    dayData = dayData.sort((a,b) => (a.date > b.date) ? 1 : ((b.date < a.date) ? -1 : 0));

    return Number( dayData[dayData.length-1].volumeUSD );
};



const getRelevantPools = async () => {
    console.log('[pools.getRelevantPools]-Getting all relevant pools');
    let skip = 0;
    let totalPairs = 0;
    const etrUsdtPool= await api.getPoolByPoolId( consts.ETH_USDT_POOL_ID );

    // Step #1
    // filter muliplier
    var filterResult = [];
    let moreResults = true;
    while (moreResults) {
        // get pairs
        console.log("calling with skip = " + skip);
        const res = await api.getPoolAllPools(consts.MIN_DAILY_VOLUME_USD, skip);

        if (res != null) {
            skip += res.length;
            totalPairs += res.length;
        }

        for (const pool of res) {
            // const liquidity = _computePoolLiquidity(pool, etrUsdtPool[0]);
            const liquidity = v3helpers.computePoolLiquidityFromApi(pool, etrUsdtPool[0]);
            pool.volumeUsd = _computeDailyVolume(pool.poolDayData);

            if (Number( pool.volumeUSD) > (consts.MULTIPLIER * (liquidity) )) {
                pool.liquidity = liquidity;
                filterResult.push(pool);
            }
        }

        if (res == null || res.length < 1000) {
            moreResults = false;
        }

        console.log("[pools.getRelevantPools]-Found total of pairs: " + totalPairs);
        console.log("[pools.getRelevantPools]-Found total of suitable pairs: " + filterResult.length);

    }

    return filterResult;
};

const _getMeanChange = async (swaps) => {
    let sumChanges = 0;

    for(let i=1; i<swaps.length; i++) {
        sumChanges += Math.abs(swaps[i].rate - swaps[i-1].rate);
    }

    return sumChanges / swaps.length;
};

const makeShortPoolsListByTimeInterval= async (pool, pairsStats, swaps, ethUsdtPool) => {
    const _pool = {};
    _pool.id = pool.id;
    _pool.name = pool.token0.symbol+'-'+pool.token1.symbol;
    _pool.dailyVolume = Number(pool.volumeUSD);
    const volumeInDailyRange = Number(helpers.getVolumeInTime(swaps[1]));
    const volumeDailyTimeRange = volumeInDailyRange * 1 / pairsStats[1].timeInRange;
    const lastRate = liquidityInRangeFile.getPriceForTick(pool.tick);
    _pool.liquidity = pool.liquidity;

    Object.keys(pairsStats).forEach(async (timeInterval) => {
        const volumeInRange = Number(helpers.getVolumeInTime(swaps[timeInterval]));
        const subPool = {
            tick: pool.tick,
            timeInterval,
            token0: pool.token0,
            token1: pool.token1,
            totalValueLockedToken0: pool.totalValueLockedToken0,
            totalValueLockedToken1: pool.totalValueLockedToken1,
            stdMultiplier: pairsStats[timeInterval].stdMultiplier ? pairsStats[timeInterval].stdMultiplier : 0,
            recommendedMinPrice: pairsStats[timeInterval].stdMinPrice ? pairsStats[timeInterval].stdMinPrice : 0,
            recommendedMaxPrice: pairsStats[timeInterval].stdMaxPrice ? pairsStats[timeInterval].stdMaxPrice : 0,
            timeInRange: pairsStats[timeInterval].timeInRange ? pairsStats[timeInterval].timeInRange: 0,
            lastRate: lastRate,
            volumeInRange,
            volumeDailyTimeRange,
            fee: Number(pool.feeTier) * consts.FEE_MULTIPLIER,
            minPrice: pairsStats[timeInterval].periodMin ? pairsStats[timeInterval].periodMin : 0,
            maxPrice: pairsStats[timeInterval].periodMax ? pairsStats[timeInterval].periodMax : 0,
        };
        const meanChange = await _getMeanChange(swaps[timeInterval]);
        subPool.meanChange = meanChange ? meanChange : 0;
        // if (subPool.recommendedMinPrice && subPool.recommendedMaxPrice) {
        //     subPool.liquidityInRange = await liquidityCollector.getLiquidityInRangeInUSD(pool,subPool.recommendedMinPrice,subPool.recommendedMaxPrice, ethUsdtPool);
        // } else {
        //     subPool.liquidityInRange = consts.LIQUIDITY_ZERO;
        // }
        // const estimatedRevenue = subPool.fee * ( pool.volumeUsd /subPool.liquidityInRange );
        const cross = helpers.getCrossBorderAmounts(subPool.recommendedMinPrice, subPool.recommendedMaxPrice, swaps[timeInterval]);
        subPool.crossRangeUpAmount = cross.maxCross;
        subPool.crossRangeDownAmount = cross.minCross;
        // subPool.estimatedRevenue = estimatedRevenue;

        _pool[timeInterval] = (subPool.recommendedMaxPrice === undefined) ? {} : subPool;
    });

    return await _pool;
};

const flattenPool = async(pool, ethUsdtPool) => {
    const res = [];
    consts.TIME_INTERVALS_IN_DAYS.forEach(async( time) => {
        try {
            const obj = {};
            obj.id = pool.id;
            obj.dailyVolume = pool.dailyVolume;
            obj.liquidity = pool.liquidity;
            obj.name = pool.name;
            Object.keys(pool[time]).forEach((k)=>{
                obj[k] = pool[time][k];
            });

            res.push(obj);
        } catch (e) {
            console.log(e);
        }

    });

        const forLoop = async _ => {
        for (let i = 0; i < res.length; i++) {
            if (res[i].recommendedMinPrice && res[i].recommendedMaxPrice) {
                try{
                    res[i].liquidityInRange = await liquidityCollector.getLiquidityInRangeInUSD(res[i],res[i].recommendedMinPrice,res[i].recommendedMaxPrice, ethUsdtPool);
                }
                catch (e) {
                    console.log(e);
                }
            } else {
                res[i].liquidityInRange = consts.LIQUIDITY_ZERO;
            }

            res[i].estimatedRevenue = res[i].fee * ( res[i].dailyVolume /res[i].liquidityInRange );
            delete(res[i].token0);
            delete(res[i].token1);
            }

        };

        await forLoop();



    return await res;
};


const proccessOnePool = async(pool, ethUsdtPool) => {

        const poolSwapData = await swaps.getSwapDataByTimeInterval(pool);
        const stts = stats.makePairStats(poolSwapData);
        const lst = await makeShortPoolsListByTimeInterval(pool, stts, poolSwapData, ethUsdtPool);
    try {
        const flatten = await flattenPool(lst, ethUsdtPool);

        return flatten;
    } catch (e) {
        console.log('Pool with id => ' + pool.id + ' failed ' + e)
    }

};

//
// const _proccessOnePool = async (pool) => {
//
// };
//
// const poolId = '0x5116f278d095ec2ad3a14090fedb3e499b8b5af6';
//
// const res = _getSinglePoolSwapData(poolId)
//     .then((res) => {
//         console.log(res);
//         // const xls = json2xls(res);
//         // fs.writeFileSync('./output/uniswap_pool_v3'+ Date() +'_.xlsx', xls, 'binary');
//     });


module.exports = {getRelevantPools, proccessOnePool};


