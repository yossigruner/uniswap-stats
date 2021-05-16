const liquidityCollector = require('./liquidityCollector.js');
const api = require('./apiv3Queries.js');
const consts = require('./consts.js');
const log = require('debug-level').log('test');

const POOL_ID = '0x5116f278d095ec2ad3a14090fedb3e499b8b5af6';
const MIN_PRICE = 2297;
const MAX_PRICE = 3359;

async function main() {
    const ethUsdtPool = await api.getPoolByPoolId(consts.ETH_USDT_POOL_ID);
    const pool = await api.getPoolByPoolId(POOL_ID);
    const t = await liquidityCollector.getLiquidityInRangeInUSD(pool[0],MIN_PRICE,MAX_PRICE, ethUsdtPool[0]);

    return t;
}

main()
    .then((res) => {
        log.info('Liquidity in range -- ' + JSON.stringify(res));
    });
