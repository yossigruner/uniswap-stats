const axios = require('axios');
const helpers = require('./helpers.js');
const json2xls = require('json2xls');
const fs = require('fs');


const getPool = async (poolId) => {
    console.log('[helpers._getLiquiditiesForPair]-Calling for poolId - ' + poolId );
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
                  id,
                  price0,
                  price1,
                  liquidityGross
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

        if(pool.id === poolId) {
            relevantPools.push(pool)
        }
    });

    if (relevantPools.length === 0) {
        return [];
    }

    return relevantPools;
};

const getPoolData = async (poolId, minRange, maxRange) => {
    const pool = await getPool(poolId);
    const res = [];

    res.push({
        volume: Number( pool[0].volumeUSD ),
        liquidity: getLiquidityForRange(pool[0].ticks, minRange, maxRange),
    });
    res[0].vOverL = res[0].volume / res[0].liquidity;

    return res;
};

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

const getLiquidityForRange = (ticks, minPrice, maxPrice) => {
    let liquiditySum = 0.00001;

    ticks.forEach((tick) => {
        let small = Number(tick.price0);
        let big = Number(tick.price1);
        if(small > big) {
            small = big;
            big = Number(tick.price0);
        }

        if(rangeIntersection([minPrice, maxPrice], [small, big])) {
            liquiditySum += Number(tick.liquidityGross);
        }
    });

    return liquiditySum;
};



const poolId = '0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801';
const minRange = 100;
const maxRange = 200;


const res = getPoolData(poolId, minRange, maxRange)
    .then((res) => {
        console.log(res);
        const xls = json2xls(res);
        fs.writeFileSync('./output/uniswap_pool_v3'+ Date() +'_.xlsx', xls, 'binary');
    });



