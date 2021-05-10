const { BigintIsh, MaxUint256, Percent, Price, CurrencyAmount, Token } = require('@uniswap/sdk-core');
const uniswapsdk = require('@uniswap/v3-sdk');
const JSBI = require('jsbi');
const ZERO = JSBI.BigInt(0)

function amount0(token0, tickCurrent, tickLower, tickUpper, liquidity, sqrtRatioX96) {
    if (tickCurrent < tickLower) {
        return new CurrencyAmount(
            token0,
            uniswapsdk.SqrtPriceMath.getAmount0Delta(
                uniswapsdk.TickMath.getSqrtRatioAtTick(tickLower),
                uniswapsdk.TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity,
                false
            )
        )
    } else if (tickCurrent < tickUpper) {
        return new CurrencyAmount(
            token0,
            uniswapsdk.SqrtPriceMath.getAmount0Delta(
                sqrtRatioX96,
                uniswapsdk.TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity,
                false
            )
        )
    }
    return new CurrencyAmount(token0, ZERO)
}

function amount1(token1, tickCurrent, tickLower, tickUpper, liquidity, sqrtRatioX96) {
    if (tickCurrent < tickLower) {
        return new CurrencyAmount(token1, ZERO)
    } else if (tickCurrent < tickUpper) {
        return new CurrencyAmount(
            token1,
            uniswapsdk.SqrtPriceMath.getAmount1Delta(
                uniswapsdk.TickMath.getSqrtRatioAtTick(tickLower),
                sqrtRatioX96,
                liquidity,
                false
            )
        )
    } else {
        return new CurrencyAmount(
            token1,
            uniswapsdk.SqrtPriceMath.getAmount1Delta(
                uniswapsdk.TickMath.getSqrtRatioAtTick(tickLower),
                uniswapsdk.TickMath.getSqrtRatioAtTick(tickUpper),
                liquidity,
                false
            )
        )
    }
}

function main() {

    var addressToken0 = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    var addressToken1 = "0xea6412Fb370e8d1605E6aEeAA21aD07C3C7e9F24";
    var liquidity = JSBI.BigInt('4280791798686518438655');

    var sqrtPrice = JSBI.BigInt('4006962723278500455702852003094')
    var currentTick = 78533;

    // var tickLower = 77400;
    // var tickUpper = 81200;

    var tickLower = 10;
    var tickUpper = 400000;

    var token0 = new Token(1, addressToken0, 18, 'weth', 'weth')
    amount0Token0 = amount0(token0, currentTick, tickLower, tickUpper, liquidity, sqrtPrice)

    var token1 = new Token(1, addressToken1, 18, 'mush', 'mush')
    amount1Token1 = amount1(token1, currentTick, tickLower, tickUpper, liquidity, sqrtPrice)

    console.log("Token0 Amount  : " + amount0Token0.toSignificant(4));
    console.log("Token1 Amount  : " + amount1Token1.toSignificant(4));
}

main()
