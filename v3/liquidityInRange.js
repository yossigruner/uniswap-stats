const api = require('./apiv3Queries.js');
const json2xls = require('json2xls');
const fs = require('fs');
const helpers = require('../helpers.js')
const JSBI = require('jsbi');


const _getPriceForTickIdx = (tickIdx) => {
    return Math.pow(1.0001, tickIdx);
};


const getLiquidityInRange = async (poolId, minRange, maxRange) => {
    let pool = [];
    try{
        pool = await api.getPoolByPoolId(poolId);
    }
    catch (e) {
        console.log(e)
    }
    const res = [];

    res.push({
        volume: Number( pool[0].volumeUSD ),
        liquidity: getLiquidityForRange(pool[0].mints, minRange, maxRange),
        minRange,
        maxRange,
    });

    res[0].vOverL = res[0].volume / res[0].liquidity;

    return res;
};

const _computerPartialLiquidityForMintAndRange = (mint, minPrice, maxPrice) => {
    const givenRangeSize = maxPrice - minPrice;
    const mintRangeSize = mint.upperBound - mint.lowerBound;
    // mint inside the given range
    if (mint.lowerBound <= minPrice && mint.upperBound >= maxPrice ) {
        return ( (givenRangeSize) / (mintRangeSize) ) * mint.amountUsd;
        //mint contains the given range
    } else if(mint.lowerBound >= minPrice && mint.upperBound <= maxPrice) {
        return mint.amountUsd;
    } else if(mint.lowerBound <= minPrice) {
        // mint starts smaller than given range
        return( (mint.upperBound - minPrice) / mintRangeSize ) * mint.amountUsd;
    } else {
        // mint starts inside the given range
        return ((maxPrice - mint.lowerBound) / mintRangeSize) * mint.amountUsd;
    }
};

const getLiquidityForRange = (mints, minPrice, maxPrice) => {

    let liquidity = 0.00001;
    const activeMints = [];
    for (let i = 0; i < mints.length; i++) {
        activeMints.push({
            tickIdxLower: Number(mints[i].tickLower),
            tickIdxUpper: Number(mints[i].tickUpper),
            lowerBound: _getPriceForTickIdx(Number(mints[i].tickLower)),
            upperBound: _getPriceForTickIdx(Number(mints[i].tickUpper)),
            amountUsd: Number(mints[i].amountUSD),

        });
    }

    const intersectMints = [];
    activeMints.forEach((mint) => {
        if(helpers.rangeIntersection([minPrice,maxPrice], [mint.lowerBound, mint.upperBound])) {
            intersectMints.push(mint);
        }
    });

    intersectMints.forEach((mint => {
        liquidity += _computerPartialLiquidityForMintAndRange(mint, minPrice, maxPrice)
    }));

    return liquidity;

};

//
// const poolId = '0x5116f278d095ec2ad3a14090fedb3e499b8b5af6';
// const minRange = 400;
// const maxRange = 2600;


// const res = getLiquidityInRange(poolId, minRange, maxRange)
//     .then((res) => {
//
//
//         console.log(res);
//         const xls = json2xls(res);
//         fs.writeFileSync('./output/uniswap_pool_v3'+ Date() +'_.xlsx', xls, 'binary');
//     });

module.exports = {getLiquidityInRange};










