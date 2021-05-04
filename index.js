const axios = require('axios');
const simple = require('simple-statistics');
const rangeCompute = require('./rangeCompute.js');
const helpers = require('./helpers.js');
const timeseriesAnalysis = require('./timeseriesAnalysis.js');
const json2xls = require('json2xls');
const fs = require('fs');

const MIN_DAILY_VOLUME_USD = 500000;
const MIN_DAILY_LIQUIDITY_USD = 100000;

const MULTIPLIER = 0.2;

const TIME_INTERVALS_IN_DAYS = [1, 4/24, 2/24, 1/24 ];
const DATES = TIME_INTERVALS_IN_DAYS.map(x=> Math.round(Date.now() / 1000 - (86400 * x)));
const NUMBEROFDAYS = 1;
const TIME_IN_RANGE_TRESHOLD = 0.7;
const NUMBEROFDAYS_HISTORICAL = 2;
const DATE = Math.round(Date.now() / 1000 - (86400 * NUMBEROFDAYS));
const DATE_HISTORICAL = Math.round(Date.now() / 1000 - (86400 * NUMBEROFDAYS_HISTORICAL));
const FRAME_SIZE_FOR_SWAP_SCAN  = 1440 * 6; // one hour * 6


// const main = async ()  => {
//
//     let result = [];
//
//     await getPairs()
//         .then(async (pairs) => {
//             await getSwapDataByTimeInterval(pairs)
//                 .then(async(swaps) => {
//                     const stats = makePairsStats(swaps);
//                     result = await makePoolsList(pairs, stats, swaps);
//                 });
//
//         });
//
//     return result
// };

const _getMeanChange = async (swaps) => {
    let sumChanges = 0;

    for(let i=1; i<swaps.length; i++) {
        sumChanges += Math.abs(swaps[i].rate - swaps[i-1].rate);
    }

    return sumChanges / swaps.length;
};

const makePoolsList = async (pairs, pairsStats, swaps) => {
    console.log();
    const pools = {};

    const forLoop = async _ => {
        for (let i = 0; i < pairs.length; i++) {
        // for (let i = 0; i < 2; i++) {
            const pool = {};
            pool.address = pairs[i].pairAddress;
            pool.name = swaps[pool.address][0].pair.token0.symbol+'-'+swaps[pool.address][0].pair.token1.symbol;
            pool.sigma2DownPrice = pairsStats[pairs[i].pairAddress].sigma2Down;
            pool.sigma2UpPrice = pairsStats[pairs[i].pairAddress].sigma2Up;
            pool.minPrice = pairsStats[pairs[i].pairAddress].periodMin;
            pool.maxPrice = pairsStats[pairs[i].pairAddress].periodMax;
            pool.std = pairsStats[pairs[i].pairAddress].std;
            pool.liquidity = Number(pairs[i].reserveUSD);
            pool.volume = Number(pairs[i].dailyVolumeUSD);
            pool.meanPrice = pairsStats[pairs[i].pairAddress].mean;
            pool.meanChange = await _getMeanChange(swaps[pool.address]);
            // TODO Change pool fee according to v3 when available
            pool.fee = 0.3;
            pool.lastRate = swaps[pool.address][swaps[pool.address].length-1].rate;;
            pool.timeInRange1Sigma = pairsStats[pairs[i].pairAddress].timeInRange1Sigma;
            pool.timeInRange2Sigma = pairsStats[pairs[i].pairAddress].timeInRange2Sigma;
            pool.estimatedRevenue = pool.fee * ( pool.volume / pool.liquidity );
            const scoredSubPools = rangeCompute.makeScoredRanges(swaps[pool.address], pairsStats[pool.address], pool.liquidity, pool.sigma2DownPrice, pool.sigma2UpPrice, pool.meanChange);
            pool.scoredPools = scoredSubPools.sort((a,b) => (a.rangeSize> b.rangeSize) ? 1 : ((b.rangeSize > a.rangeSize) ? -1 : 0));
            pools[pool.address]=pool;
        }
    };
    await forLoop();

    let poolsSorted = Object.keys(pools).map((key) => pools[key]);
    poolsSorted = poolsSorted.sort((a,b) => (a.estimatedRevenue> b.estimatedRevenue) ? -1 : ((b.estimatedRevenue > a.estimatedRevenue) ? 1 : 0));

    return {
        pools,
        poolsSorted,
    };
};


const makeShortPoolsListByTimeInterval= async (pairs, pairsStats, swaps) => {
    console.log();
    const pools = {};

    const forLoop = async _ => {
            for (let i = 0; i < pairs.length; i++) {
            // for (let i = 0; i < 2; i++) {
                const pool = {};
                pool.address = pairs[i].pairAddress;
                pool.name = swaps[pool.address][1][0].pair.token0.symbol+'-'+swaps[pool.address][1][0].pair.token1.symbol;
                pool.liquidity = Number(pairs[i].reserveUSD);
                pool.dailyVolume = Number(pairs[i].dailyVolumeUSD);
                const volumeInDailyRange = Number(helpers.getVolumeInTime(swaps[pool.address][1]));
                const volumeDailyTimeRange = volumeInDailyRange * 1 / pairsStats[pairs[i].pairAddress][1].timeInRange;

                Object.keys(pairsStats[pairs[i].pairAddress]).forEach(async (timeInterval) => {
                    const volumeInRange = Number(helpers.getVolumeInTime(swaps[pool.address][timeInterval]));
                    const subPool = {
                        timeInterval,
                        stdMinPrice: pairsStats[pairs[i].pairAddress][timeInterval].stdMinPrice,
                        stdMaxPrice: pairsStats[pairs[i].pairAddress][timeInterval].stdMaxPrice,
                        timeInRange: pairsStats[pairs[i].pairAddress][timeInterval].timeInRange,
                        lastRate: pairsStats[pairs[i].pairAddress][timeInterval].lastRate,
                        volumeInRange,
                        volumeDailyTimeRange,
                        fee: 0.3,
                        meanChange: await _getMeanChange(swaps[pool.address][timeInterval]),
                        minPrice: pairsStats[pairs[i].pairAddress][timeInterval].periodMin,
                        maxPrice: pairsStats[pairs[i].pairAddress][timeInterval].periodMax,
                    };
                    const estimatedRevenue = subPool.fee * ( subPool.volumeDailyTimeRange / pool.liquidity );
                    const cross = helpers.getCrossBorderAmounts(pairsStats[pairs[i].pairAddress][timeInterval].stdMinPrice, pairsStats[pairs[i].pairAddress][timeInterval].stdMaxPrice, swaps[pool.address][timeInterval]);
                    subPool.crossRangeUpAmount = cross.maxCross;
                    subPool.crossRangeDownAmount = cross.minCross;
                    subPool.estimatedRevenue = estimatedRevenue;

                    pool[timeInterval] = !subPool.stdMaxPrice ? {} : subPool;
                });

                pools[pool.address]=pool;
            }
        };
        await forLoop();
    return pools;
};


const makeShortPoolsList = async (pairs, pairsStats, swaps, inputMin = null, inputMax = null) => {
    console.log();
    const pools = {};

    const forLoop = async _ => {
        for (let i = 0; i < pairs.length; i++) {
        // for (let i = 0; i < 2; i++) {
            const pool = {};
            pool.address = pairs[i].pairAddress;
            pool.name = pairs[i].token0.symbol+'-'+pairs[i].token1.symbol;
            pool.stdMaxPrice = pairsStats[pairs[i].pairAddress][1].stdMaxPrice;
            pool.stdMinPrice = pairsStats[pairs[i].pairAddress][1].stdMinPrice;
            pool.stdMultiplier = pairsStats[pairs[i].pairAddress][1].stdMultiplier;
            pool.minPrice = inputMin ? inputMin : pairsStats[pairs[i].pairAddress].periodMin;
            pool.maxPrice = inputMax ? inputMax : pairsStats[pairs[i].pairAddress].periodMax;
            pool.liquidity = Number(pairs[i].reserveUSD);
            pool.dailyVolume = Number(pairs[i].volumeUSD);
            pool.volumeInRange = Number(helpers.getVolumeForRange(pool.minPrice, pool.maxPrice, swaps[pool.address][1]));
            pool.meanChange = await _getMeanChange(swaps[pool.address][1]);
            // TODO Change pool fee according to v3 when available
            pool.fee = 0.3;
            pool.currentPrice = swaps[pool.address][1][0].rate;
            pool.timeInRange = pairsStats[pairs[i].pairAddress][1].timeInRange;
            pool.estimatedRevenue = pool.fee * ( pool.volumeInRange / pool.liquidity );
            pools[pool.address]=pool;
        }
    };
    await forLoop();

    return pools;
};

const makeShortPoolsListForGivenTimeIntervalAndRange = async (pairs, pairsStats, swaps, timeInterval, inputMin = null, inputMax = null) => {
    console.log();
    const pools = {};

    const forLoop = async _ => {
        for (let i = 0; i < pairs.length; i++) {
            // for (let i = 0; i < 2; i++) {
            const pool = {};
            pool.timeIntervalInHours = timeInterval*24;
            pool.address = pairs[i].pairAddress;
            pool.name = pairs[i].token0.symbol+'-'+pairs[i].token1.symbol;
            pool.std = pairsStats[pairs[i].pairAddress][timeInterval].std;
            pool.minGivenPrice = inputMin;
            pool.maxGivenPrice = inputMax;
            pool.liquidity = Number(pairs[i].reserveUSD);
            pool.dailyVolume = Number(pairs[i].volumeUSD);
            pool.volumeInGivenRange = Number(helpers.getVolumeForRange(pool.minGivenPrice, pool.maxGivenPrice, swaps[pool.address][timeInterval]));
            pool.meanChange = await _getMeanChange(swaps[pool.address][timeInterval]);
            // TODO Change pool fee according to v3 when available
            pool.fee = 0.3;
            pool.currentPrice = swaps[pool.address][timeInterval][0].rate;
            pool.timeInRangeForGivenRate = pairsStats[pairs[i].pairAddress][timeInterval].timeInRangeForGivenRate;
            pool.estimatedRevenueForGivenRange = pool.fee * ( pool.volumeInGivenRange / pool.liquidity );
            pool.token0 = pairs[i].token0;
            pool.token1 = pairs[i].token1;
            pools[pool.address]=pool;
        }
    };
    await forLoop();

    return pools;
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
//Change
const _getSinglePairSwapData = async (pair, pairNum=1, outOf=1, historical = false, timeInterval = null) => {
    let lowerBound = timeInterval != null ? Math.round(Date.now() / 1000 - (86400 * timeInterval/24)) : DATE;
    if(historical) {
        lowerBound = DATE_HISTORICAL;
    }
    let timestamp_high = Math.round(Date.now() / 1000);
    let timestamp_low = timestamp_high - FRAME_SIZE_FOR_SWAP_SCAN;
    let moreResults = true;
    let skip = 0;
    let swapData = [];
    // console.log('Collecting swap data for pair - ' + pair.pairAddress);
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
                // console.log(res.data.data.swaps.length);
            }
        }
        timestamp_high = timestamp_low;
        timestamp_low = timestamp_low - FRAME_SIZE_FOR_SWAP_SCAN;
        moreResults = true;
    }

    return swapData.sort((a,b) => (a.transaction.timestamp < b.transaction.timestamp) ? 1 : ((b.transaction.timestamp > a.transaction.timestamp) ? -1 : 0))

};

const getSwapData = async (pairs, historical = false) => {

    const swapData = {};

    for (let i=0; i<pairs.length; i++) {
    // for (let i=0; i<2; i++) {
        const data = await _getSinglePairSwapData(pairs[i], i +1, pairs.length, historical);
        // TODO Check Rate
        data.forEach(e => e.rate = ( Math.abs(e.amount1In - e.amount1Out) / Math.abs(e.amount0In - e.amount0Out) ));
        swapData[pairs[i].pairAddress] = (data);
    }

    return swapData;
};


const getSwapDataByTimeInterval = async (pairs, historical = false) => {

    const swapData = {};

    for (let i=0; i<pairs.length; i++) {
    // for (let i=0; i<2; i++) {
        const data = await _getSinglePairSwapData(pairs[i], i +1, pairs.length, historical);
        // TODO Check Rate
        data.forEach(e => e.rate = ( Math.abs(e.amount1In - e.amount1Out) / Math.abs(e.amount0In - e.amount0Out) ));
        const res = {};
        DATES.forEach((d, idx) => {
            if(!res[TIME_INTERVALS_IN_DAYS[idx]]) {
                res[TIME_INTERVALS_IN_DAYS[idx]] = [];
            }
            data.forEach((p) => {
                if(p.transaction.timestamp > d) {
                    res[TIME_INTERVALS_IN_DAYS[idx]].push(p);
                }
            });

        });

        swapData[pairs[i].pairAddress] = res;
    }

    return swapData;
};

//change
const getSwapDataByGivenTimeInterval = async (pairs, timeInterval) => {

    const swapData = {};

    for (let i=0; i<pairs.length; i++) {
        // for (let i=0; i<2; i++) {
        const data = await _getSinglePairSwapData(pairs[i], i +1, pairs.length, null, timeInterval);
        // TODO Check Rate
        data.forEach(e => e.rate = ( Math.abs(e.amount1In - e.amount1Out) / Math.abs(e.amount0In - e.amount0Out) ));
        const res = {};

        res[timeInterval] = [];

        data.forEach((p) => {
            if(p.transaction.timestamp > timeInterval) {
                res[timeInterval].push(p);
            }
        });



        swapData[pairs[i].pairAddress] = res;
    }

    return swapData;
};

const _getPairByTimeInterval = (pair) => {
    console.log();
    const res = {};
    DATES.forEach((d, idx) => {
        if(!res[TIME_INTERVALS_IN_DAYS[idx]]) {
            res[TIME_INTERVALS_IN_DAYS[idx]] = [];
        }
        pair.forEach((p) => {
            if(p.transaction.timestamp > d) {
                res[TIME_INTERVALS_IN_DAYS[idx]].push(p);
            }
        });

    });

    return res;
};

const _makePAirStatsPerTimeInterval = (pair) => {
    const pairRates = pair.map(p => p.rate);
    const std = simple.standardDeviation(pairRates);
    const lastRate = pairRates[0];
    let stdCounter = 1;

    let timeInRange = helpers.getPercentageInRange(pairRates, lastRate - std, lastRate + std);
    while (timeInRange < TIME_IN_RANGE_TRESHOLD) {
        stdCounter += 1;
        timeInRange = helpers.getPercentageInRange(pairRates, lastRate - stdCounter * std, lastRate + stdCounter * std);
    }

    return {
        std,
        lastRate,
        periodMax: simple.max(pairRates),
        periodMin: simple.min(pairRates),
        stdMinPrice: lastRate - stdCounter * std,
        stdMaxPrice: lastRate + stdCounter * std,
        timeInRange,
        stdMultiplier: stdCounter,
    };
};

const _makePAirStatsPerTimeIntervalAndRange = (pair, minPrice, maxPrice) => {
    const pairRates = pair.map(p => p.rate);
    const std = simple.standardDeviation(pairRates);
    const lastRate = pairRates[0];
    const timeInRangeForGivenRate = helpers.getPercentageInRange(pairRates, minPrice, maxPrice);

    return {
        std,
        lastRate,
        periodMax: simple.max(pairRates),
        periodMin: simple.min(pairRates),
        givenMinPrice: minPrice,
        givenMaxPrice: maxPrice,
        timeInRangeForGivenRate,
    };
};

const _makePairStats = (pair) => {

    const pairByTimeIntervals = pair;
    const res = {};

    Object.keys(pairByTimeIntervals).forEach((k) => {
        if (pairByTimeIntervals[k].length === 0) {
            res[k] = {};
        } else {
            res[k] = _makePAirStatsPerTimeInterval(pairByTimeIntervals[k]);
        }

    });

    return res;

};

const makePairsStats = (pairs) => {
    // console.log(pairs);
    const result = {};

    for (const [key, value] of Object.entries(pairs)) {
        result[`${key}`] =  _makePairStats(value);
    }

    return result;

};

const makePairsStatsForGivenTimeIntervalAndRange = (pairs, timeInterval, minPrice, maxPrice) => {
    // console.log(pairs);
    const result = {};

    for (const [key, value] of Object.entries(pairs)) {
        result[`${key}`] =  _makePairStatsTimeIntervalAndRange(value, timeInterval, minPrice, maxPrice);
    }

    return result;

};

const _makePairStatsTimeIntervalAndRange  = (pair, timeInterval, minPrice, maxPrice) => {

    const pairByTimeIntervals = pair;
    const res = {};

    Object.keys(pairByTimeIntervals).forEach((k) => {
        if (pairByTimeIntervals[k].length === 0) {
            res[k] = {};
        } else {
            res[k] = _makePAirStatsPerTimeIntervalAndRange(pairByTimeIntervals[k], minPrice, maxPrice);
        }

    });

    return res;

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

const getPoolsTable = async () => {
    let result = [];

    await getPairs()
        .then(async (pairs) => {
            await getSwapDataByTimeInterval(pairs)
                .then(async(swaps) => {
                    const stats = makePairsStats(swaps);
                    result = await makeShortPoolsListByTimeInterval(pairs, stats, swaps);
                    result = pprint(result);

                    const xls = json2xls(result);
                    fs.writeFileSync('./output/uniswap_pools_data_'+ Date() +'_.xlsx', xls, 'binary');
                });

        });

    return result
};

const getPoolsTableForRangeAndPair = async(pairAdrdess, minPrice, maxPrice, timeInterval) => {
    let result = {};

    return await helpers.getPair(pairAdrdess)
        .then(async (pairs) => {
            await getSwapDataByGivenTimeInterval(pairs, timeInterval)
                .then(async(swaps) => {
                    const stats = makePairsStatsForGivenTimeIntervalAndRange(swaps, timeInterval, minPrice, maxPrice);
                    result = await makeShortPoolsListForGivenTimeIntervalAndRange(pairs, stats, swaps,timeInterval, minPrice, maxPrice);

                    return result;

                });
            return result;
        });

    return result
};

const getStatsForPair = async(pairAddress) => {
    let result = {};

    return await helpers.getPair(pairAddress)
        .then(async (pairs) => {
            return await getSwapData(pairs, historical = true)
                .then(async(swaps) => {
                    result = timeseriesAnalysis.analyze(swaps, pairAddress);

                    return result;
                });

        });

    return result
};

const pprint = (data) => {
    console.log();
    const res = []

    // Object.keys(data).forEach((d) => {
    //     TIME_INTERVALS_IN_DAYS.forEach((timeInterval) => {
    //         const newObj = {};
    //         Object.keys(data[d]).forEach((k) => {
    //             if ( TIME_INTERVALS_IN_DAYS.includes(Number(k)) ){
    //                 Object.keys(data[d][k]).forEach((l) => {
    //                     newObj[l] = data[d][k][l];
    //                 });
    //             } else {
    //                 newObj[k] = data[d][k];
    //             }
    //
    //             res.push(newObj);
    //         });
    //
    //
    //         });
    //     });


    TIME_INTERVALS_IN_DAYS.forEach((time) => {
        Object.keys(data).forEach((d) => {
            const obj = {};
            obj.address = data[d].address;
            obj.dailyVolume = data[d].dailyVolume;
            obj.liquidity = data[d].liquidity;
            obj.name = data[d].name;
                Object.keys(data[d][time]).forEach((k)=>{
                    obj[k] = data[d][time][k];
                });

                res.push(obj);
            });
        });



    return res.sort((a,b) => (a.estimatedRevenue < b.estimatedRevenue) ? 1 : ((b.estimatedRevenue > a.estimatedRevenue) ? -1 : 0));
};



// // API get table for range and pair
// getPoolsTableForRangeAndPair(pairAddress, minPrice, maxPrice)
//     .then((res) => {
//
//         console.log("========================================================");
//         console.log(res);
//         console.log("========================================================")
//
//     })
//     .catch((error) => {
//         console.error(error)
//     });


// API get all pools
// getPoolsTable()
//     .then((res) => {
//
//         console.log("========================================================");
//         console.log(res);
//         console.log("========================================================")
//
//     })
//     .catch((error) => {
//         console.error(error)
//     });




// API get stats for pair
// getStatsForPair(pairAddress)
//     .then((res) => {
//
//         console.log("========================================================");
//         console.log(res);
//         console.log("========================================================")
//
//     })
//     .catch((error) => {
//         console.error(error)
//     });



const main = async () => {

    const pairAddress = '0xa478c2975ab1ea89e8196811f51a7b7ade33eb11';
    const minPrice =  0;
    const maxPrice = 1;
    const timeInterval = 2/24;

    let result =  await getPoolsTable();
    // let result =  await getStatsForPair(pairAddress);
    // let result =  await getPoolsTableForRangeAndPair(pairAddress, minPrice, maxPrice, timeInterval)
    //
    return result;

};



main()
    .then((res) => {

        console.log("========================================================");
        console.log(res);
        console.log("========================================================")

    })
    .catch((error) => {
        console.error(error)
    });
