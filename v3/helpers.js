const liquidityInRangeFile = require('./liquidityInRangeFromSdk.js');
const consts = require('./consts.js');

const numberWithCommas2 = (num) => {
    if (num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    return num;
};
const numberWithCommas = (num) => {
    if (num) {
        const parts = num.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    }

    return num;


};

const computePoolLiquidityFromApi = (pool, ethUsdtPool) => {
    // const price = pool.tick > 0 ? 1 / liquidityInRangeFile.getPriceForTick(pool.tick)  : liquidityInRangeFile.getPriceForTick(pool.tick);
    const ethUsdRate = liquidityInRangeFile.getPriceForTick(ethUsdtPool, ethUsdtPool.tick);

    // if (consts.ETH_SYM.includes(pool.token0.symbol) || consts.ETH_SYM.includes(pool.token1.symbol)) {
    //     // TODO check priceForTick
    //     const price = liquidityInRangeFile.getPriceForTick(pool, pool.tick);
    //     const ethUsdRate = liquidityInRangeFile.getPriceForTick(ethUsdtPool, ethUsdtPool.tick);
    //
    //     let t0Amount = pool.totalValueLockedToken0;
    //     let t1Amount = pool.totalValueLockedToken1;
    //
    //     if(!consts.ETH_SYM.includes( pool.token0.symbol ) )  {
    //         t0Amount = pool.totalValueLockedToken1;
    //         t1Amount = pool.totalValueLockedToken0;
    //     }
    //
    //     pool.ethUsdRate = ethUsdRate;
    //     // pool.liquidity = ( Number(t0Amount) + Number(t1Amount) * price ) * ethUsdRate;
    //
    //     return ( Number(t0Amount) + Number(t1Amount) * price ) * ethUsdRate;
    // } else {
    //     const price = liquidityInRangeFile.getPriceForTick(pool, pool.tick);
    // }

    return (Number(pool.totalValueLockedToken0) * Number(pool.token0.derivedETH) +
        Number(pool.totalValueLockedToken1) * Number(pool.token1.derivedETH) ) *
        Number(ethUsdRate);


};

const computePoolLiquidityFromApiDayData = (dayData) => {
    if(!dayData || dayData.length === 0) {
        return 0;
    }

    dayData = dayData.sort((a,b) => (a.date > b.date) ? 1 : ((b.date < a.date) ? -1 : 0));

    return Number( dayData[dayData.length-1].tvlUSD );
};

const computeDailyVolume = (dayData) => {

    if(!dayData || dayData.length === 0) {
        return 0;
    }

    dayData = dayData.sort((a,b) => (a.date > b.date) ? 1 : ((b.date < a.date) ? -1 : 0));

    return Number( dayData[dayData.length-1].volumeUSD );
};

const addCommas = (pool) => {
    consts.NUMERICAL_FIELDS.forEach((field) => {
        pool[field] = numberWithCommas(pool[field]);
    });

    return pool;
};



module.exports = {computePoolLiquidityFromApi, computeDailyVolume, computePoolLiquidityFromApiDayData, numberWithCommas, addCommas};
