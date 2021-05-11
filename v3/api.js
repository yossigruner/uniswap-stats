const liquidityInRange = require('./liquidityInRangeFromSdk.js');
const pools = require('./pools.js');
const json2xls = require('json2xls');
const JSBI = require('jsbi');

// const add = JSBI.add(JSBI.BigInt(JSBI.BigInt(12282871151793690122962)));
// const result = JSBI.leftShift(JSBI.BigInt(12282871151793690122962), JSBI.BigInt(96));
// console.log('yossi:  ' + JSBI.toNumber(result));




// API - Get liquidity in range

const poolId = '0x5116f278d095ec2ad3a14090fedb3e499b8b5af6';
const minRange = 2200;
const maxRange = 2300;


const res = liquidityInRange.getLiquidityInRangeforPoolId(poolId, minRange, maxRange)
    .then((res) => {
        console.log(res);
        // const xls = json2xls(res);
        // fs.writeFileSync('./output/uniswap_pool_v3'+ Date() +'_.xlsx', xls, 'binary');
    });

// const res2 = pools.getRelevantPools()
//     .then((res) => {
//         console.dir(res, {depth: null, colors: true})
//         // const xls = json2xls(res);
//         // fs.writeFileSync('./output/uniswap_pool_v3'+ Date() +'_.xlsx', xls, 'binary');
//     });
//




