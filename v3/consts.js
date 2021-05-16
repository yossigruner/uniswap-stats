
const MIN_DAILY_VOLUME_USD = 1000000;
const MIN_DAILY_LIQUIDITY_USD = 300000;
const LIQUIDITY_V3 = true;

const MULTIPLIER = 0.1;

const TIME_INTERVALS_IN_DAYS = [1, 4/24, 2/24, 1/24 ];
const DATES = TIME_INTERVALS_IN_DAYS.map(x=> Math.round(Date.now() / 1000 - (86400 * x)));
const NUMBEROFDAYS = 1;
const TIME_IN_RANGE_TRESHOLD = 0.7;
const NUMBEROFDAYS_HISTORICAL = 2;
const DATE = Math.round(Date.now() / 1000 - (86400 * NUMBEROFDAYS));
const DATE_HISTORICAL = Math.round(Date.now() / 1000 - (86400 * NUMBEROFDAYS_HISTORICAL));
const FRAME_SIZE_FOR_SWAP_SCAN  = 3600 * 6; // one hour * 6
const ETH_USDT_POOL_ID = '0x4e68ccd3e89f51c3074ca5072bbac773960dfa36';
const ETH_SYM = ['WETH', 'ETH'];
const FEE_MULTIPLIER = Math.pow(10, -6);
const NUM_OF_CONCURRENT_POOLS = 100;
const LIQUIDITY_ZERO = 0.000000001;
const MAX_STD_FOR_SPREAD = 25;
const MAX_REVENUE = 999;


module.exports = {
    MIN_DAILY_VOLUME_USD,
    MIN_DAILY_LIQUIDITY_USD,
    MULTIPLIER,
    TIME_INTERVALS_IN_DAYS,
    DATES,
    NUMBEROFDAYS,
    TIME_IN_RANGE_TRESHOLD,
    NUMBEROFDAYS_HISTORICAL,
    DATE,
    DATE_HISTORICAL,
    FRAME_SIZE_FOR_SWAP_SCAN,
    ETH_USDT_POOL_ID,
    ETH_SYM,
    FEE_MULTIPLIER,
    NUM_OF_CONCURRENT_POOLS,
    LIQUIDITY_ZERO,
    MAX_STD_FOR_SPREAD,
    MAX_REVENUE,
};
