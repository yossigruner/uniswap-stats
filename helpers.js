
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


