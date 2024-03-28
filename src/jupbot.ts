import { getPrice, getTokens, swap, quote, getTokensObject, downloadTokensList } from './jupapi'
import { getBalanceInfo, getTokenBalance, getTokenDecimals, getPublicKey } from './solWallet'
import EnvConfig from './envConfig';
import EnvKeys from './envKeys';
import wait from './utils/wait';
import UserSetting from './settings'
import { formatDate, getVersion } from './utils/util'
import { clearScreen, moveTo, updateScreen } from './utils/screenUpdater'

const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112";

const TOKEN_A = EnvConfig.getMandatory(EnvKeys.TOKEN_A);
const TOKEN_B = EnvConfig.getMandatory(EnvKeys.TOKEN_B);
const AMOUNT = Number(EnvConfig.getMandatory(EnvKeys.AMOUNT));
// 转成百分比形式
const PROFIT = Number(EnvConfig.getMandatory(EnvKeys.PROFIT)) / 100;
// 定义ANSI转义序列来设置绿色和重置颜色
const green = '\x1b[32m';
const reset = '\x1b[0m';
const orange = '\x1b[33m';
const red = '\x1b[31m';

// 记录当前买或者卖的价格
let layer0: number;
// 卖价
let layer1: number;
// 买价
let layer_1: number;
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
async function calculateLayer1() {
    layer1 = layer0 + (layer0 * PROFIT);
}

/**
 * 计算买入位置
 */
async function calculateLayer_1() {
    layer_1 = layer0 - (layer0 * PROFIT);
}


async function buy(decimals: number) {
    const price = await getPrice(TOKEN_B, TOKEN_A);
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
                    } else {
                        console.log("\u{1F4C8}卖出", userSetting.tokenBSymbol, "失败");
                    }
                })
            }
        }
    );
}

async function updateScreenShow() {
    const balanceInfo = await getBalanceInfo(TOKEN_B)
    let info: string = "";
    const maxLength = 40;
    const toFixed = 4;
    info += `${reset}🚀🌕：${await getVersion()}\n`;
    info += `${reset}地址：${orange}${await getPublicKey()}\n`;
    //计算盈利百分比
    const profit = (((balanceInfo.token * balanceInfo.tokenPrice) - (buyTime * AMOUNT)) / (buyTime * AMOUNT)) / 100;
    if (profit > 0) {
        info += `${reset}时间：${green}${await formatDate(new Date())}${reset}`.padEnd(maxLength);
        info += `${reset}盈利：${green}${profit.toFixed(1)}${reset}\n`;
    } else {
        info += `${reset}时间${green}${await formatDate(new Date())}${reset}`.padEnd(maxLength);
        info += `${reset}亏损：${red}${profit.toFixed(1)}${reset}\n`;
    }
    info += `${reset}买入触发：${green}${layer_1 / Math.pow(10, userSetting.tokenBDecimals)}${reset}`.padEnd(maxLength);
    info += `${reset}卖出触发：${green}${layer1 / Math.pow(10, userSetting.tokenBDecimals)}${reset}\n`;
    info += `${reset}买入：${green}${buyTime}${reset}`.padEnd(maxLength);
    info += `${reset}卖出：${green}${sellTime}${reset}\n`;
    info += `${reset}Sol数量：${green}${balanceInfo.sol.toFixed(toFixed)}${reset}`.padEnd(maxLength);
    info += `${reset}${userSetting.tokenBSymbol}数量：${green}${balanceInfo.token.toFixed(toFixed)}${reset}\n`;
    info += `${reset}Sol价格：${green}${balanceInfo.solPrice.toFixed(toFixed)}${reset}`.padEnd(maxLength);
    info += `${reset}${userSetting.tokenBSymbol}价格：${green}${balanceInfo.tokenPrice.toFixed(toFixed)}${reset}\n`;
    info += `${reset}USDC数量：${green}${balanceInfo.usdc.toFixed(toFixed)}${reset}`.padEnd(maxLength);
    info += `${reset}总价值(${userSetting.tokenBSymbol}+USDC)：${green}${(balanceInfo.token * balanceInfo.tokenPrice + balanceInfo.usdc).toFixed(toFixed)}${reset}\n`;
    updateScreen(info);
}


async function montionPrice() {
    const tokenA_decimals = await getTokenDecimals(TOKEN_A)
    const tokenB_decimals = await getTokenDecimals(TOKEN_B)
    while (true) {
        updateScreenShow();
        const price = await getPrice(TOKEN_B, TOKEN_A);
        if (price > layer1) {
            const tokenBalance = await getTokenBalance(TOKEN_B);
            const totalTokenBalance = tokenBalance * price;
            //如果剩余的不够卖
            if (totalTokenBalance <= 5) {
                await buy(tokenA_decimals)
            } else {
                await sell(tokenB_decimals)
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


start()