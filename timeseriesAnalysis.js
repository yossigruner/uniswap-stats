const tsanalysis = require('timeseries-analysis');

module.exports = {
    analyze : (data) => {
        return _analyze(data);
    },
};

const _analyze = (data) => {
    const t = new tsanalysis.main(data);
    const url =  t.ma({period: 2}).chart();
    console.log(url);
};
