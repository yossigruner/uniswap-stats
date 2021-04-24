const axios = require('axios')

const MIN_DAILY_VOLUME_USD = 100000;
const MIN_DAILY_LIQUIDITY_USD = 100;

const MULTIPLIER = 2;
const NUMBEROFDAYS = 1;
const DATE = Math.round(Date.now() / 1000 - (86400 * NUMBEROFDAYS));
const FRAME_SIZE_FOR_SWAP_SCAN  = 1440 * 6; // one hour * 6


const main = async ()  => {

    let result = [];

    await getPairs()
        .then(async (results) => {
            result = await getSwapData(results);

        });

    return result
}

const getPairs = async () => {
    let skip = 0;
    let totalPairs = 0;

    // Step #1
    // filter muliplier
    var filterResult = []
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
        })

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
}

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
}

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

}

const getSwapData = async (pairs) => {

    const swapData = [];

    for (let i=0; i<pairs.length; i++) {
        const data = await _getSinglePairSwapData(pairs[i], i +1, pairs.length);
        // TODO Check Rate
        data.forEach(e => e.rate = ( Math.abs(e.amount1In - e.amount1Out) / Math.abs(e.amount0In - e.amount0Out) ));
        swapData.push(data);
    }

    return swapData;
}

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

        console.log("========================================================")
        console.log(res)
        console.log("========================================================")

    })
    .catch((error) => {
        console.error(error)
    })
