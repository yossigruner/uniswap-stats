const consts = require('../v3/consts.js');
const api = require('../v3/apiv3Queries.js');
const liquidityInRange = require('../v3/liquidityInRangeFromSdk.js');
const log = require('debug-level').log('test');
const swaps = require('../v3/swaps.js');



const main = async () => {

    const allPools = await api.getPoolAllPools(1,0);
    const swapsData = {};
    for (let i = 0; i < allPools.length; i++ ) {
        log.debug('[pump_alerts - main] - calling pool id ' + allPools[i].id);
        swapsData[allPools[i].id] = await swaps.getSinglePoolSwapData(allPools[i].id, poolNum=1, outOf=1, historical = false, timeInterval = consts.PUMP_DATE);
    }

    log.debug('');

    //
    return result;

};



main()
    .then((res) => {

        console.log("========================================================");
        console.log(res);
        console.log("========================================================")

    })
    .catch((error) => {
        console.error(error)
    });
