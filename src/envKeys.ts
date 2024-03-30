// EnvKeys.ts

// 使用枚举来定义环境变量的键
enum EnvKeys {
    PRIVATE_KEY = 'PRIVATE_KEY',
    API_ENDPOINT = 'API_ENDPOINT',
    TOKEN_A = 'TOKEN_A',
    TOKEN_B = 'TOKEN_B',
    //滑点 如果设置为50 为0.5
    SLIPPAGE_BPS = 'SLIPPAGE_BPS',
    //单次下单金额
    AMOUNT = 'AMOUNT',
    //监听价格间隔
    MONTION_PRICE_DURATION = 'MONTION_PRICE_DURATION',
    //盈利率，百分比
    PROFIT = 'PROFIT',
    //终止时卖出所有
    TERMINATION_SELL_ALL = "TERMINATION_SELL_ALL",
    //模拟发送交易
    SIMULATE_TRANSCATION = "SIMULATE_TRANSCATION"
}

export default EnvKeys;
