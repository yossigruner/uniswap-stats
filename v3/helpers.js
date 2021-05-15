const liquidityInRangeFile = require('./liquidityInRangeFromSdk.js');
const consts = require('./consts.js');

const computePoolLiquidityFromApi = (pool, ethUsdtPool) => {
    const price = pool.tick > 0 ? 1 / liquidityInRangeFile.getPriceForTick(pool.tick)  : liquidityInRangeFile.getPriceForTick(pool.tick);
    const ethUsdRate = ethUsdtPool.tick < 0 ? liquidityInRangeFile.getPriceForTick(ethUsdtPool.tick) * Math.pow(10, 12) : liquidityInRangeFile.getPriceForTick(ethUsdtPool.tick) ;

    let t0Amount = pool.totalValueLockedToken0;
    let t1Amount = pool.totalValueLockedToken1;

    if(!consts.ETH_SYM.includes( pool.token0.symbol ) )  {
        t0Amount = pool.totalValueLockedToken1;
        t1Amount = pool.totalValueLockedToken0;
    }

    pool.ethUsdRate = ethUsdRate;
    pool.liquidity = ( Number(t0Amount) + Number(t1Amount) * price ) * ethUsdRate;

    return pool.liquidity;

};

module.exports = {computePoolLiquidityFromApi};
