const axios = require('axios');


module.exports = {
    getVolumeForRange : (min, max, pairStats) => {
        let volume = 0;
        pairStats.forEach((ps) => {
            if (ps.rate >= min && ps.rate <= max) {
                volume += Number(ps.amountUSD);
            }
        });

        return volume;
    },
    getPercentageInRange : (rates, min, max) => {
        let inRange = 0;
        rates.forEach((r) => {
            if (r <= max && r >= min){
                inRange++;
            }
        });

        return inRange / rates.length;
    },

    getPair : async (pairId) => {
        return await _getPair(pairId);
    },

};

const _getPair = async (pairId) => {
    const res = await axios.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
        query: `
                {
                 pair(id: "`+ pairId +`"){
                     token0 {
                       id
                       symbol
                       name
                       derivedETH
                     }
                     token1 {
                       id
                       symbol
                       name
                       derivedETH
                     }
                     reserve0
                     reserve1
                     reserveUSD
                     trackedReserveETH
                     token0Price
                     token1Price
                     volumeUSD
                     txCount
                     id
     }
    }

        `
    });

    if (!res.data.data  | !res.data.data.pair) {
        return null;
    }

    res.data.data.pair.pairAddress = pairId;

    return [res.data.data.pair];
};

const _getTokenData = async (tokenId) => {
    const res = await axios.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
        query: `
            {
            tokenDayDatas(orderBy: date, orderDirection: asc,
              where: {
                token: "` +tokenId+ `"
              }
              ) {
                id
                date
                priceUSD
                totalLiquidityToken
                totalLiquidityUSD
                totalLiquidityETH
                dailyVolumeETH
                dailyVolumeToken
                dailyVolumeUSD
                }
            }

        `
    });

    if (res.data.data == null || res.data.data.tokenDayDatas == null || res.data.data.tokenDayDatas.length == 0) {
        return null;
    }

    return {
        dailyVolumeUsd: res.data.data.tokenDayDatas[0].dailyVolumeUSD,
        dailyLiquidityUsd: res.data.data.tokenDayDatas[0].totalLiquidityUSD,
        priceUsd: res.data.data.tokenDayDatas[0].priceUSD,
    }
}


