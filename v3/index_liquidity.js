const liquidityCollector = require('./liquidityCollector.js');
const api = require('./apiv3Queries.js');
const consts = require('./consts.js');
const pools = require('./pools.js');
const log = require('debug-level').log('test');


const POOL_ID = '0x07f3d316630719f4fc69c152f397c150f0831071';
const MIN_PRICE = 0;
const MAX_PRICE = 4200;

async function main() {
    const ethUsdtPool = await api.getPoolByPoolId(consts.ETH_USDT_POOL_ID);
    const pool = await api.getPoolByPoolId(POOL_ID);
    const liquidity = await liquidityCollector.getLiquidityInRangeInUSD(pool[0],
        MIN_PRICE, 
        MAX_PRICE, 
        ethUsdtPool[0]);
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
