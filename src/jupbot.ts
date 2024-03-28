import { getPrice, getTokens, swap, quote, getTokensObject, downloadTokensList } from './jupapi'
import { getBalanceInfo, getTokenBalance, getTokenDecimals, getPublicKey } from './solWallet'
import EnvConfig from './envConfig';
import EnvKeys from './envKeys';
import wait from './utils/wait';
import UserSetting from './settings'
import { formatDate, getVersion, formatTimeDifference, roundToDecimal } from './utils/util'
import { clearScreen, moveTo, updateScreen } from './utils/screenUpdater'

const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112";

const TOKEN_A = EnvConfig.getMandatory(EnvKeys.TOKEN_A);
const TOKEN_B = EnvConfig.getMandatory(EnvKeys.TOKEN_B);
const AMOUNT = Number(EnvConfig.getMandatory(EnvKeys.AMOUNT));
// 转成百分比形式
const PROFIT = Number(EnvConfig.getMandatory(EnvKeys.PROFIT)) / 100;
const TERMINATION_SELL_ALL = EnvConfig.getBoolean(EnvKeys.TERMINATION_SELL_ALL, false);

// 定义ANSI转义序列来设置绿色和重置颜色
const green = '\x1b[32m';
const reset = '\x1b[0m';
const orange = '\x1b[33m';
const red = '\x1b[31m';

// 记录当前买或者卖的价格
let layer0: number = 0;
// 卖价
let layer1: number = 0;
// 买价
let layer_1: number = 0;
// 开始运行时间
let startTime: Date;

// 用户设置数据缓存
let userSetting: UserSetting = {
    tokenASymbol: "",
    tokenAAddress: "",
    tokenADecimals: 0,
    tokenBSymbol: "",
    tokenBAddress: "",
    tokenBDecimals: 0,
};

// 买的次数
let buyTime = 0;
// 卖的次数
let sellTime = 0;
// 总共购买的数量
let totalBuyAmount = 0;

async function start() {
    console.log("开始初始化");
    await init();
    console.log("初始化完成✅");
    const tokenA_decimals = await getTokenDecimals(TOKEN_A)
    await buy(tokenA_decimals)
    console.log("开始🚀🌕");
    clearScreen();
    montionPrice();
}

async function init() {
    startTime = new Date();
    await downloadTokensList();
    const tokensObject = await getTokensObject();
    const tokenA = tokensObject[TOKEN_A];
    const tokenB = tokensObject[TOKEN_B];
    if (tokenA) {
        userSetting.tokenASymbol = tokenA.symbol;
        userSetting.tokenAAddress = tokenA.address;
        userSetting.tokenADecimals = tokenA.decimals;
    } else {
        console.log("请检查TokenA是否正确")
        process.exit(0);
    }
    if (tokenB) {
        userSetting.tokenBSymbol = tokenB.symbol;
        userSetting.tokenBAddress = tokenB.address;
        userSetting.tokenBDecimals = tokenB.decimals;
    } else {
        console.log("请检查TokenB是否正确")
        process.exit(0);
    }

}

/**
 * 计算卖出未知
 */
function calculateLayer1() {
    layer1 = layer0 + (layer0 * PROFIT);
}

/**
 * 计算买入位置
 */
function calculateLayer_1() {
    layer_1 = layer0 - (layer0 * PROFIT);
}


async function buy(decimals: number) {
    const price = await getPrice(TOKEN_B, TOKEN_A);
    if (!price) {
        return;
    }
    //这里固定TokenA 必须是USDC，避免做过多的逻辑判断
    let amount = AMOUNT;
    amount = Math.floor(amount * Math.pow(10, decimals));
    await quote(TOKEN_A, TOKEN_B, amount).then(
        (quote) => {
            if (quote) {
                console.log("\u{1F4C9}买入", userSetting.tokenBSymbol, amount / Math.pow(10, decimals));
                swap(quote).then((isScueess) => {
                    if (isScueess) {
                        console.log("\u{1F4C9}买入", userSetting.tokenBSymbol, "成功");
                        layer0 = price;
                        calculateLayer1();
                        calculateLayer_1();
                        buyTime++;
                        totalBuyAmount += Number(quote.outAmount);
                    } else {
                        console.log("\u{1F4C9}买入", userSetting.tokenBSymbol, "失败");
                    }
                })
            }
        }
    );

}

async function sell(decimals: number) {
    //这里固定TokenA 必须是USDC，避免做过多的逻辑判断
    //得到TokenB 单价
    const price = await getPrice(TOKEN_B, TOKEN_A);
    if (!price) {
        return;
    }
    let amount = AMOUNT / price;
    amount = Math.floor(amount * Math.pow(10, decimals));
    await quote(TOKEN_B, TOKEN_A, amount).then(
        (quote) => {
            if (quote) {
                console.log("\u{1F4C8}卖出", userSetting.tokenBSymbol, amount / Math.pow(10, decimals));
                swap(quote).then((isScueess) => {
                    if (isScueess) {
                        console.log("\u{1F4C8}卖出", userSetting.tokenBSymbol, "成功");
                        layer0 = price;
                        calculateLayer1();
                        calculateLayer_1();
                        sellTime++;
                        totalBuyAmount -= Number(quote.inAmount);
                    } else {
                        console.log("\u{1F4C8}卖出", userSetting.tokenBSymbol, "失败");
                    }
                })
            }
        }
    );
}


/**
 * 卖出通过程序买到的所有Token
 */
async function sellAll() {
    // 这里固定TokenA 必须是USDC，避免做过多的逻辑判断
    // 得到TokenB 单价
    const price = await getPrice(TOKEN_B, TOKEN_A);
    if (!price) {
        return;
    }
    let amount = (AMOUNT * (buyTime - sellTime)) / price;
    if (amount <= 0) {
        return;
    }
    amount = Math.floor(amount * Math.pow(10, userSetting.tokenBDecimals));
    try {
        const quote_ = await quote(TOKEN_B, TOKEN_A, amount);
        if (quote_) {
            console.log("\u{1F4C8}卖出", userSetting.tokenBSymbol, amount / Math.pow(10, userSetting.tokenBDecimals));
            const isSuccess = await swap(quote_);
            if (isSuccess) {
                console.log("\u{1F4C8}卖出", userSetting.tokenBSymbol, "成功");
            } else {
                console.log("\u{1F4C8}卖出", userSetting.tokenBSymbol, "失败");
            }
        }
    } catch (error) {
        console.error('卖出过程中发生错误：', error);
        throw error; // 抛出错误，以便在上层处理
    }
}

async function updateScreenShow() {
    const balanceInfo = await getBalanceInfo(TOKEN_B)
    let info: string = "";
    const maxLength = 50;
    // 保留几位小数
    const toFixed = 4;
    info += `${reset}🚀🌕：${await getVersion()}${reset}\n`;
    info += `${reset}运行时长：${orange}${await formatTimeDifference(startTime.getTime(), new Date().getTime())}${reset}\n`;
    info += `${reset}地址：${orange}${await getPublicKey()}${reset}\n`;
    info += `${reset}当前价格：${green}${await getPrice(TOKEN_B, TOKEN_A)}${reset}\n`;
    if (balanceInfo.tokenPrice) {
        //计算盈利百分比,利用总共购买的Token价值和购买金额计算
        const totalTokenPrice = (totalBuyAmount / Math.pow(10, userSetting.tokenBDecimals)) * balanceInfo.tokenPrice;
        const profit = totalTokenPrice - ((buyTime - sellTime) * AMOUNT);
        //盈利百分比
        const profitPec = profit / (balanceInfo.token * balanceInfo.tokenPrice + balanceInfo.usdc);
        if (profit >= 0) {
            info += `${reset}时间：${green}${await formatDate(new Date())}${reset}`.padEnd(maxLength);
            info += `${reset}盈利：${green}${roundToDecimal(profitPec, 5) * 100}%(${roundToDecimal(profit, 2)}USDC)${reset}\n`;
        } else {
            info += `${reset}时间：${green}${await formatDate(new Date())}${reset}`.padEnd(maxLength);
            info += `${reset}亏损：${red}${roundToDecimal(profitPec, 5) * 100}%(${roundToDecimal(profit, 2)}USDC)${reset}\n`;
        }
    }
    info += `${reset}买入：${green}${layer_1}${reset}`.padEnd(maxLength);
    info += `${reset}卖出：${green}${layer1}${reset}\n`;
    info += `${reset}买入：${green}${buyTime}${reset}`.padEnd(maxLength);
    info += `${reset}卖出：${green}${sellTime}${reset}\n`;
    info += `${reset}Sol数量：${green}${roundToDecimal(balanceInfo.sol, toFixed)}${reset}`.padEnd(maxLength);
    info += `${reset}${userSetting.tokenBSymbol}数量：${green}${roundToDecimal(balanceInfo.token, toFixed)}${reset}\n`;
    if (balanceInfo.solPrice) {
        info += `${reset}Sol价格：${green}${roundToDecimal(balanceInfo.solPrice, toFixed)}${reset}`.padEnd(maxLength);
    }
    info += `${reset}${userSetting.tokenBSymbol}价格：${green}${balanceInfo.tokenPrice}${reset}\n`;
    info += `${reset}USDC数量：${green}${roundToDecimal(balanceInfo.usdc, 2)}${reset}`.padEnd(maxLength);
    if (balanceInfo.tokenPrice) {
        info += `${reset}总价值💰(${userSetting.tokenBSymbol}+USDC)：${green}${roundToDecimal((balanceInfo.token * balanceInfo.tokenPrice + balanceInfo.usdc), toFixed)}${reset}\n`;
    }
    updateScreen(info);
}


async function montionPrice() {
    const tokenA_decimals = await getTokenDecimals(TOKEN_A)
    const tokenB_decimals = await getTokenDecimals(TOKEN_B)
    while (true) {
        updateScreenShow();
        const price = await getPrice(TOKEN_B, TOKEN_A);
        if (!price) {
            return;
        }
        if (price > layer1) {
            const tokenBalance = await getTokenBalance(TOKEN_B);
            const totalTokenBalance = tokenBalance * price;
            //如果剩余的不够卖
            if (totalTokenBalance <= 5) {
                await buy(tokenA_decimals)
            } else {
                // 只有当购买过才触发卖
                if (buyTime > 0) {
                    await sell(tokenB_decimals)
                }
            }
        } else if (price < layer_1) {
            const usdcBalance = await getTokenBalance(TOKEN_A);
            //如果剩余的不够买
            if (usdcBalance <= 5) {
                await sell(tokenB_decimals)
            } else {
                await buy(tokenA_decimals)
            }
        }

        await wait(Number(EnvConfig.get(EnvKeys.MONTION_PRICE_DURATION, "5000")));
    }

}

process.on('SIGINT', async () => {
    console.log('程序被中断 (Ctrl+C)');
    if (TERMINATION_SELL_ALL) {
        try {
            await sellAll();
            console.log('所有操作已完成，程序正常退出');
            process.exit(0); // 正常退出
        } catch (error) {
            console.error('发生错误：', error);
            process.exit(1); // 异常退出
        }
    }
});



start()