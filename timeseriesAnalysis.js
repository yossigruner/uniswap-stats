const tsanalysis = require('timeseries-analysis');

module.exports = {
    analyze : (data, pairAddress) => {
        return _analyze(data, pairAddress);
    },
};

const _analyze = (data, pairAddress) => {
    // const agg = data[pairAddress].map(x => [x.transaction.timestamp, x.rate]);
    const byDay = _aggreateByDayOfTheWeek(data, pairAddress);
    const byHour = _aggreateByHourOfTheDay(data, pairAddress);

    return {
        byDay,
        byHour,
    };

};


const _aggreateByDayOfTheWeek = (data, pairAddress) => {
    const daysMap = {};
    data[pairAddress].forEach((e) => {
        const time = new Date();
        time.setTime(e.transaction.timestamp * 1000);
        const day = time.getDay();
        const wkDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayName = wkDays[day];

        if (!daysMap[dayName]) {
            daysMap[dayName] = {
                txCount : 0,
                volume : 0,
            };
        }

        daysMap[dayName].txCount += 1;
        daysMap[dayName].volume += Number(e.amountUSD);

     });

    return daysMap;
};

const _aggreateByHourOfTheDay = (data, pairAddress) => {
    const hoursMap = {};
    data[pairAddress].forEach((e) => {
        const time = new Date();
        time.setTime(e.transaction.timestamp * 1000);
        const hour = time.getUTCHours();

        if (!hoursMap[hour]) {
            hoursMap[hour] = {
                txCount : 0,
                volume : 0,
            };
        }

        hoursMap[hour].txCount += 1;
        hoursMap[hour].volume += Number(e.amountUSD);

    });

    return hoursMap;
};
