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

    getLiquiditySumForPoolAndRange : async (poolAddress, minPrice, maxPrice) => {
        return await _getLiquiditySumForPoolAndRange(poolAddress, minPrice, maxPrice );
    },


    getVolumeInTime : (pairStats) => {
        let volume = 0;
        pairStats.forEach((ps) => {
                volume += Number(ps.amountUSD);
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

    getCrossBorderAmounts : (min, max, rates) => {
        let maxCross = 0;
        let minCross = 0;
        for( let i=1; i< rates.length; i++) {
            if(rates[i-1].rate < max && rates[i].rate >= max) {
                maxCross += 1;
            } else if(rates[i-1].rate > min && rates[i].rate <= min) {
                    minCross += 1;

            }
        }

        return {
            maxCross,
            minCross,
        }
    },

    getPair : async (pairId) => {
        return await _getPair(pairId);
    },

};

const _getLiquiditiesForPair = async (poolAddress) => {
    const res = await axios.post('https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-rinkeby', {
        query: `
                {
  ticks(where: {poolAddress: "`+ poolAddress +`"}){
    poolAddress
    tickIdx
    liquidityNet,
    liquidityGross,
    liquidityProviderCount,
    createdAtBlockNumber,
    volumeUSD,
    price0,
    price1,
    untrackedVolumeUSD
  }
}

        `
    });

    if (!res.data.data  | !res.data.data.ticks) {
        return null;
    }

    return res.data.data.ticks;
};

const _getLiquiditySumForPoolAndRange = async (poolAddress, minPrice, maxPrice) => {
    const activePools = await _getLiquiditiesForPair(poolAddress);
    let liquiditySum = 0.00000000000001;

    activePools.forEach((pool) => {
        if(rangeIntersection([minPrice, maxPrice], [Number(pool.price0), Number(pool.price1)])) {
            liquiditySum += Number(pool.liquidityGross);
        }
    });

    return liquiditySum;
};


// const t = _getLiquiditySumForPoolAndRange('0x21e99aeecd1cfe260b573ef9cd5f915f78af563d', 4.271223424139419e-9, 4.782958283300437e-10)
//     .then((l) => console.log(l));

const rangeIntersection = (a , b) => {
    const min = (a[0] < b[0] ? a : b);
    const max = (min == a ? b : a);

    if (min[1] < max[0] ) {
        return false;
    }

    const r = [max[0] , min[1] < max[1] ? min[1] : max[1]];

    if(!r || r.length == 0) {
        return false;
    }

    return true;
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


