const pools = require('./pools.js');
const consts = require('./consts.js');
const liquidityCollector = require('./liquidityCollector.js');
const json2xls = require('json2xls');
const converter = require('json-2-csv');
const fs = require('fs');
const api = require('./apiv3Queries.js');
const log = require('debug-level').log('test');
const liquidityInRange = require('./liquidityInRangeFromSdk.js');
const v3helpers = require('./helpers.js');



async function main() {

    const ethUsdtPool = await api.getPoolByPoolId(consts.ETH_USDT_POOL_ID);
    const relevantPools = await pools.getRelevantPools();
    let indexProcessed = 0;
    let amountProcessed = 0;
    let jobs = [];
    let result = [];
    while (indexProcessed < relevantPools.length && amountProcessed <= consts.NUM_OF_CONCURRENT_POOLS) {
        jobs.push(relevantPools[indexProcessed]);
        if (amountProcessed === consts.NUM_OF_CONCURRENT_POOLS || indexProcessed === relevantPools.length-1) {
            const res = await getNumPools(jobs,amountProcessed, ethUsdtPool[0]);
            log.info('Amount processed (pool number, out of) => ( ' + indexProcessed + ',' + relevantPools.length + ')');
            result = result.concat([].concat.apply([], res));
            amountProcessed = 0;
            jobs = [];
            indexProcessed += 1;
        } else {
            indexProcessed += 1;
            amountProcessed += 1;
        }


    }
    log.debug('Amount processed (pool number, out of) => ( ' + indexProcessed + ',' + relevantPools.length + ')');

    const filterdResult = [];
    for (let i = 0; i < result.length; i++ ) {
        if (result[i].volumeDailyTimeRange >= consts.MIN_DAILY_VOLUME_USD &&
            result[i].liquidity >= consts.MIN_DAILY_LIQUIDITY_USD &&
            result[i].liquidityInRange != consts.LIQUIDITY_ZERO &&
            result[i].volumeDailyTimeRange) {
            filterdResult.push(v3helpers.addCommas( result[i]) );
        }
    }

    log.info('After filtering amount pools remained - ' + filterdResult.length);

    return await filterdResult;

}

async function getNumPools(poolJobs, num, ethUsdtPool) {
    const res = [];
    const promises = [];
    for (let i = 0; i <= num; i++) {
        promises.push(pools.proccessOnePool(poolJobs[i], ethUsdtPool));
    }

    return await Promise.all(promises);
}

main()
    .then(async (res) => {
        const result = res.sort((a,b) => (a.estimatedRevenue > b.estimatedRevenue) ? 1 : ((b.estimatedRevenue < a.estimatedRevenue) ? -1 : 0));
        const csvData = await converter.json2csvAsync(result)
        const dateString = new Date().toISOString().split('.')[0].replace(/[^\d]/gi,'')
        const fileName = `./output/uniswap_pools_data_${dateString}.csv`
        fs.writeFileSync(fileName, csvData);
        console.log(`DONE - ${fileName}`)
    });
