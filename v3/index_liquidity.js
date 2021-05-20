const liquidityCollector = require('./liquidityCollector.js');
const api = require('./apiv3Queries.js');
const consts = require('./consts.js');
const pools = require('./pools.js');
const log = require('debug-level').log('test');


const POOL_ID = '0xc2e9f25be6257c210d7adf0d4cd6e3e881ba25f8';
const MIN_PRICE = 3700;
const MAX_PRICE = 4200;

async function main() {
    const ethUsdtPool = await api.getPoolByPoolId(consts.ETH_USDT_POOL_ID);
    const pool = await api.getPoolByPoolId(POOL_ID);
    const liquidity = await liquidityCollector.getLiquidityInRangeInUSD(pool[0],MIN_PRICE,MAX_PRICE, ethUsdtPool[0]);
    let data = {};
    try {
        data = await pools.proccessOnePool(pool[0], ethUsdtPool[0]);
    } catch (e) {
        log.warn('[index_liquidity.main] - Error in process one pool');
        log.debug(e);
    }

    return {
        liquidity,
        data,
    };
}

main()
    .then((res) => {
        log.info('Liquidity in range -- ' + JSON.stringify(res.liquidity));
        res.data.forEach((r) => {
            log.info('Pool by time interval (time interval, daily volume, estimated revenue) => ' +
                '' + '(' + r.timeInterval + ' ,' + r.volumeDailyTimeRange + ', '+ ( Number(r.volumeDailyTimeRange) / Number(res.liquidity) ) * Number(r.fee) + ')');
        });

    });
