const api = require('./apiv3.js');
const json2xls = require('json2xls');
const fs = require('fs');
const JSBI = require('jsbi');




const getPoolData = async (poolId, minRange, maxRange) => {
    const pool = await api.getPoolByPoolId(poolId);
    const res = [];

    res.push({
        volume: Number( pool[0].volumeUSD ),
        liquidity: JSBI.toNumber(getLiquidityForRange(pool[0].ticks, minRange, maxRange)),
    });
    res[0].vOverL = res[0].volume / res[0].liquidity;

    return res;
};


const getLiquidityForRange = (ticks, minPrice, maxPrice) => {
    let liquidity = 0.00001;
    for (let i = 0; i < ticks.length; i++) {
        ticks[i].tickIdx = Number(ticks[i].tickIdx);
        ticks[i].liquidityGross = Number(ticks[i].liquidityGross);
        ticks[i].liquidityNet = Number(ticks[i].liquidityNet);
        ticks[i].price0 = Number(ticks[i].price0);
        ticks[i].price1 = Number(ticks[i].price1);
    }

    ticks = ticks.sort((x, y) => (x.tickIdx > y.tickIdx) ? 1 : -1);
    const boundaris = {};

    for (let i = 0; i < ticks.length - 1; i++) {
        if (ticks[i].price0 <= minPrice && minPrice <= ticks[i + 1].price0) {
            boundaris.low = ticks[i].price0;
            boundaris.lowIndex = i;
        }
    }
    if(!boundaris.low) {
        boundaris.low = 0;
        boundaris.lowIndex = -1;
    }

    for (let j = 0; j < ticks.length - 2; j++) {
        if (ticks[j].price0 <= maxPrice && maxPrice <= ticks[j + 1].price0) {
            boundaris.high = ticks[j + 1].price0;
            boundaris.highIndex = j + 1;
        }
    }

    if(!boundaris.high) {
        boundaris.high = 0;
        boundaris.highIndex = -1;
    }

    const liquidityInRange = _computeLiquidityForIndices(ticks, boundaris.lowIndex, boundaris.highIndex);
    const highLiquidityInRangeAsNumber = JSBI.toNumber(liquidityInRange);

    return JSBI.divide(liquidityInRange, JSBI.BigInt(boundaris.highIndex - boundaris.lowIndex) );



    console.log(boundaris);
};

const _computeLiquidityForIndices = (ticks, index1, index2) => {

    if (index1<0) {
        return 0;
    }
    let liquidity = 0;

    for(let i=index1; i < index2; i++ ) {
        liquidity = JSBI.add( JSBI.BigInt( ticks[i].liquidityNet), JSBI.BigInt(liquidity ));
    }

    return liquidity;
};



const poolId = '0x5116f278d095ec2ad3a14090fedb3e499b8b5af6';
const minRange = 351;
const maxRange = 1000;


const res = getPoolData(poolId, minRange, maxRange)
    .then((res) => {


        console.log(res);
        const xls = json2xls(res);
        fs.writeFileSync('./output/uniswap_pool_v3'+ Date() +'_.xlsx', xls, 'binary');
    });



