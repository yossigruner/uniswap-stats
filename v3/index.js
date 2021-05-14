const pools = require('./pools.js');
const consts = require('./consts.js');
const liquidityCollector = require('./liquidityCollector.js');
const json2xls = require('json2xls');
const fs = require('fs');
const api = require('./apiv3Queries.js')



async function main() {

    // const t = await liquidityCollector.getLiquidityInRangeInUSD({},100,8000);
    const ethUsdtPool = await api.getPoolByPoolId(consts.ETH_USDT_POOL_ID);

    const relevantPools = await pools.getRelevantPools();
    let indexProcessed = 0;
    let amountProcessed = 0;
    let jobs = [];
    let result = [];
    while (indexProcessed < relevantPools.length && amountProcessed <= consts.NUM_OF_CONCURRENT_POOLS) {
        indexProcessed += 1;
        amountProcessed+= 1;
        jobs.push(relevantPools[indexProcessed]);
        if (amountProcessed === consts.NUM_OF_CONCURRENT_POOLS) {
            const res = await getNumPools(jobs,amountProcessed, ethUsdtPool[0]);
            console.log('Amount processed (pool number, out of) => ( ' + indexProcessed + ',' + relevantPools.length + ')');
            result = result.concat([].concat.apply([], res));
            amountProcessed = 0;
            jobs = [];
        }
    }
    console.log('Amount processed (pool number, out of) => ( ' + indexProcessed + ',' + relevantPools.length + ')');

    return await result;

}

async function getNumPools(poolJobs, num, ethUsdtPool) {
    const res = [];
    const promises = [];
    for (let i = 0; i < num; i++) {
        promises.push(pools.proccessOnePool(poolJobs[i], ethUsdtPool));
    }

    return await Promise.all(promises);
}

const startDate = Date.now();
console.log('Start - '+ startDate);
main()
    .then((res) => {
        const result = res.sort((a,b) => (a.estimatedRevenue > b.estimatedRevenue) ? 1 : ((b.estimatedRevenue < a.estimatedRevenue) ? -1 : 0));
        const xls = json2xls(result);
        fs.writeFileSync('./output/uniswap_pools_data_'+ Date() +'_.xlsx', xls, 'binary');
        console.log('End - '+ Date.now());
    });
