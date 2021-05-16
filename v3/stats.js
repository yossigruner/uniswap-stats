const simple = require('simple-statistics');
const helpers = require('../helpers.js');
const consts = require('./consts.js');
const log = require('debug-level').log('test');

const makePairStatsPerTimeInterval = (pair) => {
    const pairRates = pair.map(p => p.rate);
    const std = simple.standardDeviation(pairRates);
    const lastRate = pairRates[0];
    let stdCounter = 1;

    let timeInRange = helpers.getPercentageInRange(pairRates, lastRate - std, lastRate + std);
    while (timeInRange < consts.TIME_IN_RANGE_TRESHOLD && stdCounter < consts.MAX_STD_FOR_SPREAD) {
        stdCounter += 1;
        timeInRange = helpers.getPercentageInRange(pairRates, lastRate - stdCounter * std, lastRate + stdCounter * std);
    }

    return {
        std,
        lastRate,
        periodMax: simple.max(pairRates),
        periodMin: simple.min(pairRates),
        stdMinPrice: lastRate - stdCounter * std,
        stdMaxPrice: lastRate + stdCounter * std,
        timeInRange,
        stdMultiplier: stdCounter,
    };
};

const makePairStats = (pair) => {

    const pairByTimeIntervals = pair;
    const res = {};

    Object.keys(pairByTimeIntervals).forEach((k) => {
        if (pairByTimeIntervals[k].length === 0) {
            res[k] = {};
        } else {
            res[k] = makePairStatsPerTimeInterval(pairByTimeIntervals[k]);
        }

    });

    return res;

};


module.exports = {makePairStatsPerTimeInterval, makePairStats}
