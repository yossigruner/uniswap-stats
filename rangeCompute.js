const helpers = require('./helpers.js');

module.exports = {
    makeScoredRanges : (rates, pairStats, liquidity, min, max, meanChange) => {
        const shortRates = [];
        for (let i=min; i<=max; i+= meanChange ){
            shortRates.push(i);
        }

        return getAllSubRangesForMeanChange(shortRates, rates, pairStats, liquidity, min, max);
    },
};



const isEqual = (first, second) => {
    return JSON.stringify(first) === JSON.stringify(second) || JSON.stringify(second) === JSON.stringify(first);
}

const getAllSubRangesForMeanChange = (ratesShort, rates, pairStats, liquidity, min, max) => {
    let i, j, result = [];

    for (i = 0; i < ratesShort.length; i++) {
        for (j = i + 1; j < ratesShort.length; j++) {
            const isIn = result.some(e => isEqual(e, [ratesShort[i], ratesShort[j]]));
            if (!isIn && i != j) {
                const volume = helpers.getVolumeForRange(ratesShort[i], ratesShort[j], rates);
                result.push({
                    range: [ratesShort[i],ratesShort[j]],
                    volume,
                    // TODO custom liquidity for v3
                    liquidity,
                    estimatedRevenue: volume / liquidity,
                    timeInRange: helpers.getPercentageInRange(rates.map(x=>x.rate), ratesShort[i], ratesShort[j]),
                    rangeSize: ratesShort[j]-ratesShort[i],
                });
            }
        }
    }
    return result;
};

// const getAllSubRanges = (ratesShort, rates, pairStats, liquidity, min, max) => {
//     let i, j, result = [];
//
//     for (i = 0; i < rates.length; i++) {
//         for (j = i + 1; j < rates.length; j++) {
//             const isIn = result.some(e => isEqual(e, [rates[i].rate, rates[j].rate]));
//             if (!isIn && i != j && (min <= i <= max) && ((min <= j <= max))) {
//                 const volume = helpers.getVolumeForRange(rates[i].rate, rates[j].rate, rates);
//                 result.push({
//                     range: [rates[i].rate,rates[j].rate],
//                     volume,
//                     // TODO custom liquidity for v3
//                     liquidity,
//                     estimatedRevenue: volume / liquidity,
//                     timeInRange: helpers.getPercentageInRange(rates.map(x=>x.rate), rates[i].rate, rates[j].rate),
//                     rangeSize: rates[j].rate-rates[i].rate,
//                 });
//             }
//         }
//         console.log(i);
//     }
//     return result;
// };



