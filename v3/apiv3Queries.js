const axios = require('axios');

const URI_TESTING = 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-testing';
const URI_ALT = 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-alt';

const URI = URI_ALT;

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
                  symbol,
                  decimals,
                  totalSupply,
                  volume,
                  volumeUSD,
                  untrackedVolumeUSD,
                  txCount,
                  poolCount,
                  totalValueLocked,
                  totalValueLockedUSD,
                  derivedETH,
                  whitelistPools {
                    id
                  },
                  tokenDayData {
                    id
                  }
                },
                token1 {
                  id,
                  name,
                  symbol,
                  decimals,
                  totalSupply,
                  volume,
                  volumeUSD,
                  untrackedVolumeUSD,
                  txCount,
                  poolCount,
                  totalValueLocked,
                  totalValueLockedUSD,
                  derivedETH,
                  whitelistPools {
                    id
                  },
                  tokenDayData {
                    id
                  }
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
        const pool = await axios.post(URI, {
            query: `
                {
                  pools(first: 1000, skip: ` + skip +`){
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
                      id,
                      name,
                      symbol,
                      decimals,
                      totalSupply,
                      volume,
                      volumeUSD,
                      untrackedVolumeUSD,
                      txCount,
                      poolCount,
                      totalValueLocked,
                      totalValueLockedUSD,
                      derivedETH,
                      whitelistPools {
                        id
                      },
                      tokenDayData {
                        id
                      }
                    }
                    token1{
                      id,
                      name,
                      symbol,
                      decimals,
                      totalSupply,
                      volume,
                      volumeUSD,
                      untrackedVolumeUSD,
                      txCount,
                      poolCount,
                      totalValueLocked,
                      totalValueLockedUSD,
                      derivedETH,
                      whitelistPools {
                        id
                      },
                      tokenDayData {
                        id
                      }
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
        return await axios.post(URI, {
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

