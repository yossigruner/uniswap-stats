const api = require('./apiv3Queries.js');
const json2xls = require('json2xls');
const fs = require('fs');
const helpers = require('../helpers.js');
const consts = require('./consts.js');
const liquidityInRange = require('./liquidityInRangeFromSdk.js')


const _computePoolLiquidity = (pool, ethUsdtPool) => {
   const liquidity = liquidityInRange.getAllPoolliquidity(pool).ethAmount;
   const ethUsdRate = 1 / liquidityInRange.getPriceForTick(ethUsdtPool.currentTick);

   return liquidity * ethUsdRate;
};

const _getSinglePoolSwapData = async (poolId, poolNum=1, outOf=1, historical = false, timeInterval = null) => {
    let lowerBound = timeInterval != null ? Math.round(Date.now() / 1000 - (86400 * timeInterval/24)) : consts.DATE;
    let timestamp_high = Math.round(Date.now() / 1000);
    let timestamp_low = timestamp_high - consts.FRAME_SIZE_FOR_SWAP_SCAN;
    let moreResults = true;
    let skip = 0;
    let swapData = [];
    // console.log('Collecting swap data for pair - ' + pair.pairAddress);
    while (timestamp_high >= lowerBound) {
        while (moreResults) {
            // console.log('Calling pair: ('+ poolNum +'/'+ outOf +')'+ pool.token0.name +'-'+ pool.token1.name + 'with high: ' + timestamp_high + ' and low: ' + timestamp_low + ' limit: ' + lowerBound + ' skip: '+ skip);
            const res = await api.querySwapData(skip, poolId, timestamp_high, timestamp_low);

            if (res.data.data != null && res.data.data.swaps != null) {
                if ( res.data.data.swaps.length === 1000 ) {
                    skip += 1000;
                    moreResults = true;
                } else {
                    skip = 0;
                    moreResults = false;
                }

                if (skip > 5000) {
                    moreResults = false;
                    skip = 0;
                }
                // TODO: UPdate data
                swapData = swapData.concat(res.data.data.swaps);
                // console.log(res.data.data.swaps.length);
            }
        }
        timestamp_high = timestamp_low;
        timestamp_low = timestamp_low - consts.FRAME_SIZE_FOR_SWAP_SCAN;
        moreResults = true;
    }

    return swapData.sort((a,b) => (a.transaction.timestamp < b.transaction.timestamp) ? 1 : ((b.transaction.timestamp > a.transaction.timestamp) ? -1 : 0))

};

const getRelevantPools = async () => {
    console.log('[pools.getRelevantPools]-Getting all relevant pools');
    let skip = 0;
    let totalPairs = 0;
    const etrUsdtPool= await api.getPoolByPoolId( '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36' );

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
            if (Number( pool.volumeUSD) > (consts.MULTIPLIER * (_computePoolLiquidity(pool, etrUsdtPool[0])))) {
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


module.exports = {getRelevantPools};


