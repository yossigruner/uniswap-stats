const axios = require('axios')

const MIN_DAILY_VOLUME_USD = 1000000;
const DATE = 1617392958 
const MULTIPLIER = 3;

const main = async () => {

    // get pairs
    const res = await axios.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
        query: `
        {
            pairDayDatas(first: 100, orderBy: date, orderDirection: asc,
              where: {
                dailyVolumeUSD_gt: ` + MIN_DAILY_VOLUME_USD + `
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

    // Step #1
    // filter muliplier
    var filterResult = []
    for (const pairDay of res.data.data.pairDayDatas) {
        if (pairDay.dailyVolumeUSD > (MULTIPLIER * pairDay.reserveUSD)) {
            filterResult.push(pairDay);
        }
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