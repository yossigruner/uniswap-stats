const axios = require('axios');

const URI = 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-subgraph';

const getPoolByPoolId = async (poolId) => {
    console.log('[helpers._getLiquiditiesForPair]-Calling for poolId - ' + poolId );
    const pool = await axios.post(URI, {
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
                totalValueLockedToken0,
                totalValueLockedToken1,
                tick,
                poolDayData {
                  id,
                  tvlUSD,
                  volumeToken0,
                  volumeToken1,
                  volumeUSD,
                  date,
                },
                ticks {
                  id,
                  price0,
                  price1,
                  liquidityGross,
                  liquidityNet,
                  liquidityProviderCount,
                  tickIdx,
                  volumeToken0,
                  volumeToken1
                },
                mints{
                  amountUSD,
                  tickLower,
                  tickUpper,
                  amount
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

const getPoolAllPools = async (volume, skip) => {
    console.log('[apiv3.getPoolAllPools]-Calling fall pools with skip - ' + skip);
    try {
        const pool = await axios.post('https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-subgraph', {
            query: `
                {
                  pools(first: 1000, skip: ` + skip +`, where: 
                    {volumeUSD_gt: ` + volume +`}){
                    id,
                    volumeUSD,
                    sqrtPrice,
                    tick,
                    feeTier,
                    totalValueLockedToken0,
                    totalValueLockedToken1,
                    poolDayData {
                      id,
                      tvlUSD,
                      volumeToken0,
                      volumeToken1,
                      volumeUSD,
                      date,
                    },
                    token0 {
                      name,
                      symbol,
                      id
                    }
                    token1{
                      name,
                      symbol,
                      id
                    }
                    ,ticks {
                      tickIdx,
                      price0,
                      price1,
                      liquidityNet,
                      liquidityGross                
                    },
                    mints{
                      amount,
                      amountUSD,
                      tickLower,
                      tickUpper
                  
                    }
                  }
                }

        `
        });

        if (!pool.data.data  | !pool.data.data.pools) {
            return null;
        }

        return pool.data.data.pools;
    } catch (e) {
        console.log(e);
    }

};

const querySwapData = async (skip, pairAddress, timestamp_high, timestamp_low) => {
    try {
        return await axios.post('https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-subgraph', {
            query: `
            {
                    
                       swaps(first: 1000, skip: ` + skip + `, 
                       where: { 
                           pool: "` + pairAddress + `", 
                           timestamp_gte:` + timestamp_low + `, 
                           timestamp_lte:` + timestamp_high + ` } 
                       orderBy: timestamp, orderDirection: desc) {
                      transaction {
                        id
                        timestamp
                      }
                      id,
                      tick

                    token0 {
                      id,
                      symbol,
                      name
                    }
                    token1 {
                      id,
                      symbol,
                      name
                    }
                      
                      amount0,
                      amount1
                      amountUSD
                    }

                }
            
        `
        })
    } catch (e) {
        console.log(e);
    }

};

module.exports = {getPoolByPoolId, getPoolAllPools, querySwapData};

