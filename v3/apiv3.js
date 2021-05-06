const axios = require('axios');

const getPoolByPoolId = async (poolId) => {
    console.log('[helpers._getLiquiditiesForPair]-Calling for poolId - ' + poolId );
    const pool = await axios.post('https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-subgraph', {
        query: `
                {
              pools(where: {id: "` + poolId + `"})
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
                  liquidityGross,
                  liquidityNet,
                  liquidityProviderCount,
                  tickIdx
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
                  id,
                  
                }
            
              }
              }

        `
    });

    if (!pool.data.data  | !pool.data.data.pools) {
        return null;
    }

    return pool.data.data.pools;
};

const getPoolAllPools = async () => {
    console.log('[helpers._getLiquiditiesForPair]-Calling for poolId - ' + poolId );
    const pool = await axios.post('https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-subgraph', {
        query: `
                {
              pools(first: 1000)
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
                  liquidityGross,
                  liquidityNet,
                  liquidityProviderCount,
                  tickIdx
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
                  id,
                  
                }
            
              }
              }

        `
    });

    if (!pool.data.data  | !pool.data.data.pools) {
        return null;
    }

    return data.data.pools;
};

module.exports = {getPoolByPoolId, getPoolAllPools};

