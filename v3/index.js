const pools = require('./pools.js');
const consts = require('./consts.js');
const liquidityCollector = require('./liquidityCollector.js');
const json2xls = require('json2xls');
const fs = require('fs');
const api = require('./apiv3Queries.js');
const log = require('debug-level').log('test');



async function main() {

    const ethUsdtPool = await api.getPoolByPoolId(consts.ETH_USDT_POOL_ID);
    // const pool = await api.getPoolByPoolId('0x5116f278d095ec2ad3a14090fedb3e499b8b5af6');
    // const t = await liquidityCollector.getLiquidityInRangeInUSD(pool[0],2297,3359, ethUsdtPool[0]);



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
            log.info('Amount processed (pool number, out of) => ( ' + indexProcessed + ',' + relevantPools.length + ')');
            result = result.concat([].concat.apply([], res));
            amountProcessed = 0;
            jobs = [];
        }
    }
    log.info('Amount processed (pool number, out of) => ( ' + indexProcessed + ',' + relevantPools.length + ')');

    const filterdResult = [];
    for (let i = 0; i < result.length; i++ ) {
        if (result[i].volumeDailyTimeRange >= consts.MIN_DAILY_VOLUME_USD && result[i].liquidity >= consts.MIN_DAILY_LIQUIDITY_USD) {
            filterdResult.push(result[i]);
        }
    }

    log.info('After filtering amount pools remained - ' + filterdResult.length);

    return await filterdResult;

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

main()
    .then((res) => {
        const result = res.sort((a,b) => (a.estimatedRevenue > b.estimatedRevenue) ? 1 : ((b.estimatedRevenue < a.estimatedRevenue) ? -1 : 0));
        const xls = json2xls(result);
        fs.writeFileSync('./output/uniswap_pools_data_'+ Date() +'_.xlsx', xls, 'binary');

    });
