const liquidityInRange = require('./liquidityInRange.js');
const pools = require('./pools.js')
const json2xls = require('json2xls');




/// API - Get liquidity in range

const poolId = '0x5116f278d095ec2ad3a14090fedb3e499b8b5af6';
const minRange = 400;
const maxRange = 2600;


// const res = liquidityInRange.getLiquidityInRange(poolId, minRange, maxRange)
//     .then((res) => {
//         console.log(res);
//         // const xls = json2xls(res);
//         // fs.writeFileSync('./output/uniswap_pool_v3'+ Date() +'_.xlsx', xls, 'binary');
//     });

const res2 = pools.getRelevantPools()
    .then((res) => {
        console.dir(res, {depth: null, colors: true})
        // const xls = json2xls(res);
        // fs.writeFileSync('./output/uniswap_pool_v3'+ Date() +'_.xlsx', xls, 'binary');
    });





