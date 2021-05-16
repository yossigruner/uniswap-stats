const consts = require('./consts.js');
const api = require('./apiv3Queries.js');
const liquidityInRange = require('./liquidityInRangeFromSdk.js');
const log = require('debug-level').log('test');


const getSinglePoolSwapData = async (poolId, poolNum=1, outOf=1, historical = false, timeInterval = null) => {
    let lowerBound = timeInterval != null ? Math.round(Date.now() / 1000 - (86400 * timeInterval/24)) : consts.DATE;
    let timestamp_high = Math.round(Date.now() / 1000);
    let timestamp_low = timestamp_high - consts.FRAME_SIZE_FOR_SWAP_SCAN;
    let moreResults = true;
    let skip = 0;
    let swapData = [];
    // console.log('Collecting swap data for pair - ' + pair.pairAddress);
    while (timestamp_high >= lowerBound) {
        while (moreResults) {
            const res = await api.querySwapData(skip, poolId, timestamp_high, timestamp_low);
            log.debug('Calling pair: (poolId, high, low): ' + '('+ poolId +',' +timestamp_high +','+ timestamp_low  +') - got (amount results)' + '(' + res.data.data.swaps.length + ')' );
            if (res.data.data != null && res.data.data.swaps != null) {
                if ( res.data.data.swaps.length === 1000 ) {
                    skip += 1000;
                    moreResults = true;
                } else {
                    skip = 0;
                    moreResults = false;
                }

                if (skip > 5000) {
                    moreResults = false;
                    skip = 0;
                }
                // TODO: UPdate data
                swapData = swapData.concat(res.data.data.swaps);
                // console.log(res.data.data.swaps.length);
            }
        }
        timestamp_high = timestamp_low;
        timestamp_low = timestamp_low - consts.FRAME_SIZE_FOR_SWAP_SCAN;
        moreResults = true;
    }

    return swapData.sort((a,b) => (a.transaction.timestamp < b.transaction.timestamp) ? 1 : ((b.transaction.timestamp > a.transaction.timestamp) ? -1 : 0))

};

const getSwapDataByTimeInterval = async (pool, historical = false) => {
    // for (let i=0; i<2; i++) {
    const data = await getSinglePoolSwapData(pool.id, 1, 1, historical);
    // TODO Check Rate
    data.forEach(e => e.rate = ( liquidityInRange.getPriceForTick(pool, e.tick) ));
    const res = {};
    consts.DATES.forEach((d, idx) => {
        if(!res[consts.TIME_INTERVALS_IN_DAYS[idx]]) {
            res[consts.TIME_INTERVALS_IN_DAYS[idx]] = [];
        }
        data.forEach((p) => {
            if(p.transaction.timestamp > d) {
                res[consts.TIME_INTERVALS_IN_DAYS[idx]].push(p);
            }
        });

    });

    return res;
};

module.exports = {getSinglePoolSwapData, getSwapDataByTimeInterval};
