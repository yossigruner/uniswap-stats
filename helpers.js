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

    rangeIntersection : (a , b) => {
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
    },

    getLiquiditySumForPoolAndRange : async (poolAddress, minPrice, maxPrice, name) => {
        return await _getLiquiditySumForPoolAndRange(poolAddress, minPrice, maxPrice, name );
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

const _getLiquiditiesForPair = async (poolAddress, name) => {
   console.log('[helpers._getLiquiditiesForPair]-Calling for pair - ' + name );
    const pool = await axios.post('https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-subgraph', {
        query: `
                {
  pools
  {
    id,
    liquidityProviderCount,
    createdAtBlockNumber,
    volumeUSD,
    liquidity,
    feeTier,
    sqrtPrice,
    tick,
    ticks {
      id
    }
    token0 {
      id,
      name,
      symbol
    },
    token1 {
      id,
      name,
      symbol
    },
    ticks {
      id
    }

  }
  }

        `
    });

    if (!pool.data.data  | !pool.data.data.pools) {
        return null;
    }

    const relevantPools = [];

    pool.data.data.pools.forEach((pool) => {
        const token0Symbol = pool.token0.symbol;
        const token1Symbol = pool.token1.symbol;

        if(token0Symbol+'-'+token1Symbol === name || token1Symbol + '-' + token0Symbol === name) {
            relevantPools.push(pool)
        }
    });

    if (relevantPools.length === 0) {
        return [];
    }

    const res = await axios.post('https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-subgraph', {
        query: `
                {
  ticks(where: {poolAddress: "`+ relevantPools[0].id +`"}){
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

const _getLiquiditySumForPoolAndRange = async (poolAddress, minPrice, maxPrice, name) => {
    const activePools = await _getLiquiditiesForPair(poolAddress, name);
    let liquiditySum = 0.00000000000001;

    activePools.forEach((pool) => {
        let small = Number(pool.price0);
        let big = Number(pool.price1);
        if(small > big) {
            small = big;
            big = Number(pool.price0);
        }

        if(rangeIntersection([minPrice, maxPrice], [small, big])) {
            liquiditySum += Number(pool.liquidityGross);
        }
    });

    return liquiditySum;
};


// const t = _getLiquiditySumForPoolAndRange('0x21e99aeecd1cfe260b573ef9cd5f915f78af563d', 4.271223424139419e-9, 4.782958283300437e-10)
//     .then((l) => console.log(l));





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
};


