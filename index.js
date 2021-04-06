const axios = require('axios')

const MIN_DAILY_VOLUME_USD = 100000;
const MIN_DAILY_LIQUIDITY_USD = 100;


const MULTIPLIER = 2;
const NUMBEROFDAYS = 1;
const DATE = Math.round(Date.now() / 1000 - (86400 * NUMBEROFDAYS))


const main = async () => {
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
                    pairDayDatas(first: 1000,skip: `+ skip + `,  orderBy: date, orderDirection: asc,skip: $skip,
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


    // Setp #2

    for (const pairDay of filterResult) {

    }


    // Step #3

    // Step #4


    return filterResult
}

main()
    .then((res) => {

        console.log("========================================================")
        console.log(res)
        console.log("========================================================")

    })
    .catch((error) => {
        console.error(error)
    })