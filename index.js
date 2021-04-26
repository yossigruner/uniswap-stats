const axios = require('axios');
const simple = require('simple-statistics');

const MIN_DAILY_VOLUME_USD = 100000;
const MIN_DAILY_LIQUIDITY_USD = 100;

const MULTIPLIER = 2;
const NUMBEROFDAYS = 1;
const DATE = Math.round(Date.now() / 1000 - (86400 * NUMBEROFDAYS));
const FRAME_SIZE_FOR_SWAP_SCAN  = 1440 * 6; // one hour * 6


const main = async ()  => {

    let result = [];

    await getPairs()
        .then(async (pairs) => {
            await getSwapData(pairs)
                .then(async(swaps) => {
                    const stats = makePairsStats(swaps);
                    result = await makePoolsList(pairs, stats, swaps);
                });

        });

    return result
};

const makePoolsList = async (pairs, pairsStats, swaps) => {
    console.log();
    const pools = {};

    const forLoop = async _ => {
        for (let i = 0; i < pairs.length; i++) {
        // for (let i = 0; i < 1; i++) {
            const pool = {};
            pool.address = pairs[i].pairAddress;
            pool.name = swaps[pool.address][0].pair.token0.symbol+'-'+swaps[pool.address][0].pair.token1.symbol;
            pool.sigma2DownPrice = pairsStats[pairs[i].pairAddress].sigma2Down;
            pool.sigma2UpPrice = pairsStats[pairs[i].pairAddress].sigma2Up;
            pool.minPrice = pairsStats[pairs[i].pairAddress].periodMin;
            pool.maxPrice = pairsStats[pairs[i].pairAddress].periodMax;
            pool.liquidity = Number(pairs[i].reserveUSD);
            pool.volume = Number(pairs[i].dailyVolumeUSD);
            pool.meanPrice = pairsStats[pairs[i].pairAddress].mean;
            // TODO Change pool fee according to v3 when available
            pool.fee = 0.3;
            pool.lastRate = swaps[pool.address][swaps[pool.address].length-1].rate;;
            pool.timeInRange1Sigma = pairsStats[pairs[i].pairAddress].timeInRange1Sigma;
            pool.timeInRange2Sigma = pairsStats[pairs[i].pairAddress].timeInRange2Sigma;
            pool.estimatedRevenue = pool.fee * ( pool.volume / pool.liquidity );
            pools[pool.address]=pool;
        }
    };
    await forLoop();

    let poolsSorted = Object.keys(pools).map((key) => pools[key]);
    poolsSorted = poolsSorted.sort((a,b) => (a.estimatedRevenue> b.estimatedRevenue) ? -1 : ((b.estimatedRevenue > a.estimatedRevenue) ? 1 : 0))

    return {
        pools,
        poolsSorted,
    };
};

const _getVolumeForRange = async (min, max, pairStats) => {
    let volume = 0;
    pairStats.forEach((ps) => {
        if (ps.rate >= min && ps.rate <= max) {
            volume += ps.amountUSD;
        }
    });

    return volume;
};

const getPairs = async () => {
    let skip = 0;
    let totalPairs = 0;

    // Step #1
    // filter muliplier
    var filterResult = [];
    let moreResults = true;
    while (moreResults) {
        // get pairs
        console.log("calling with skip = " + skip);
        const res = await axios.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
            query: `
            {
                    pairDayDatas(first: 1000,skip: ` + skip + `,  orderBy: date, orderDirection: asc,skip: $skip,
                    where: {
                        dailyVolumeUSD_gt: ` + MIN_DAILY_VOLUME_USD + `
                        reserveUSD_gt: ` + MIN_DAILY_LIQUIDITY_USD + `
                        date_gt: ` + DATE + `
                    })
                    {
                        token0 {
                            name
                        },
                        token1{
                            name
                        }
                        dailyTxns
                        dailyVolumeUSD
                        reserveUSD
                        pairAddress,
                        date
                    }
                }
            
        `
        });

        if (res.data.data != null && res.data.data.pairDayDatas != null) {
            skip += res.data.data.pairDayDatas.length;
            totalPairs += res.data.data.pairDayDatas.length;
        }

        for (const pairDay of res.data.data.pairDayDatas) {
            if (pairDay.dailyVolumeUSD > (MULTIPLIER * pairDay.reserveUSD)) {
                filterResult.push(pairDay);
            }
        }

        if (res.data.data.pairDayDatas == null || res.data.data.pairDayDatas.length < 1000) {
            moreResults = false;
        }

        console.log("Found total of pairs: " + totalPairs);
        console.log("Found total of suitable pairs: " + filterResult.length);

    }

    return filterResult;
};

const _querySwapData = async (skip, pairAddress, timestamp_high, timestamp_low) => {
    return await axios.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
        query: `
            {
                    
                       swaps(first: 1000, skip: ` + skip + `, 
                       where: { 
                           pair: "` + pairAddress + `", 
                           timestamp_gte:` + timestamp_low + `, 
                           timestamp_lte:` + timestamp_high + ` } 
                       orderBy: timestamp, orderDirection: desc) {
                      transaction {
                        id
                        timestamp
                      }
                      id
                      pair {
                        token0 {
                          id
                          symbol
                        }
                        token1 {
                          id
                          symbol
                        }
                      }
                      amount0In
                      amount0Out
                      amount1In
                      amount1Out
                      amountUSD
                      to
                    }

                }
            
        `
    })
};

const _getSinglePairSwapData = async (pair, pairNum, outOf) => {
    const lowerBound = DATE;
    let timestamp_high = Math.round(Date.now() / 1000);
    let timestamp_low = timestamp_high - FRAME_SIZE_FOR_SWAP_SCAN;
    let moreResults = true;
    let skip = 0;
    let swapData = [];

    while (timestamp_high >= lowerBound) {
        while (moreResults) {
            console.log('Calling pair: ('+ pairNum +'/'+ outOf +')'+ pair.token0.name +'-'+ pair.token1.name + 'with high: ' + timestamp_high + ' and low: ' + timestamp_low + ' limit: ' + lowerBound + ' skip: '+ skip);
            const res = await _querySwapData(skip, pair.pairAddress, timestamp_high, timestamp_low);

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
                console.log(res.data.data.swaps.length);
            }
        }
        timestamp_high = timestamp_low;
        timestamp_low = timestamp_low - FRAME_SIZE_FOR_SWAP_SCAN;
        moreResults = true;
    }

    return swapData.sort((a,b) => (a.transaction.timestamp > b.transaction.timestamp) ? 1 : ((b.transaction.timestamp > a.transaction.timestamp) ? -1 : 0))

};

const getSwapData = async (pairs) => {

    const swapData = {};

    for (let i=0; i<pairs.length; i++) {
    // for (let i=0; i<1; i++) {
        const data = await _getSinglePairSwapData(pairs[i], i +1, pairs.length);
        // TODO Check Rate
        data.forEach(e => e.rate = ( Math.abs(e.amount1In - e.amount1Out) / Math.abs(e.amount0In - e.amount0Out) ));
        swapData[pairs[i].pairAddress] = (data);
    }

    return swapData;
};

// const _getTokenData = async (tokenId) => {
//     const res = await axios.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
//         query: `
//             {
//             tokenDayDatas(orderBy: date, orderDirection: asc,
//               where: {
//                 token: "` +tokenId+ `"
//               }
//               ) {
//                 id
//                 date
//                 priceUSD
//                 totalLiquidityToken
//                 totalLiquidityUSD
//                 totalLiquidityETH
//                 dailyVolumeETH
//                 dailyVolumeToken
//                 dailyVolumeUSD
//                 }
//             }
//
//         `
//     });
//
//     if (res.data.data == null || res.data.data.tokenDayDatas == null || res.data.data.tokenDayDatas.length == 0) {
//         return null;
//     }
//
//     return {
//         dailyVolumeUsd: res.data.data.tokenDayDatas[0].dailyVolumeUSD,
//         dailyLiquidityUsd: res.data.data.tokenDayDatas[0].totalLiquidityUSD,
//         priceUsd: res.data.data.tokenDayDatas[0].priceUSD,
//     }
// }

const _getPercentageInRange = (rates, min, max) => {
    let inRange = 0;
    rates.forEach((r) => {
        if (r <= max && r >= min){
            inRange++;
        }
    });

    return inRange / rates.length;
};

const _makePairStats = (pair) => {

    const pairRates = pair.map(p => p.rate);
    const  sigma1Up = simple.mean(pairRates) + simple.standardDeviation(pairRates);
    const  sigma2Up = simple.mean(pairRates) + 2 * simple.standardDeviation(pairRates);
    const  sigma1Down = simple.mean(pairRates) - simple.standardDeviation(pairRates);
    const  sigma2Down = simple.mean(pairRates) - 2 * simple.standardDeviation(pairRates);

    return {
         variance: simple.variance(pairRates),
         std: simple.standardDeviation(pairRates),
         periodMax: simple.max(pairRates),
         periodMin: simple.min(pairRates),
         mean: simple.mean(pairRates),
         median: simple.median(pairRates),
         sigma1Up,
         sigma2Up,
         sigma1Down,
         sigma2Down,
         timeInRange1Sigma: _getPercentageInRange(pairRates, sigma1Down, sigma1Up),
         timeInRange2Sigma: _getPercentageInRange(pairRates, sigma2Down, sigma2Up),
    };

};

const makePairsStats = (pairs) => {
    // console.log(pairs);
    const result = {};

    // for (let i = 0; i < pairs.length; i++) {
    //     result[pairs[i].pairAddress] = _makePairStats(pairs[i]);
    // }

    for (const [key, value] of Object.entries(pairs)) {
        result[`${key}`] =  _makePairStats(value);
    }

    return result;

};

    // Setp #2sx

//     for (const pairDay of filterResult) {
//
//     }
//
//
//     // Step #3
//
//     // Step #4
//
//
//     return filterResult
// }

main()
    .then((res) => {

        console.log("========================================================");
        console.log(res.poolsSorted);
        console.log("========================================================")

    })
    .catch((error) => {
        console.error(error)
    });
