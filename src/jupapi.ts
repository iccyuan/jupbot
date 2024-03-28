import { createJupiterApiClient, QuoteResponse } from '@jup-ag/api';
import { Connection, Keypair, VersionedTransaction, clusterApiUrl } from "@solana/web3.js";
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";
import { transactionSenderAndConfirmationWaiter } from "./utils/transactionSender";
import { getSignature } from "./utils/getSignature";
import EnvConfig from './envConfig';
import EnvKeys from './envKeys';
import axios from 'axios';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

const jupiterQuoteApi = createJupiterApiClient();
const wallet = new Wallet(
    Keypair.fromSecretKey(bs58.decode(EnvConfig.getMandatory(EnvKeys.PRIVATE_KEY)))
);

const API_ENDPOINT = EnvConfig.get(EnvKeys.API_ENDPOINT, clusterApiUrl('mainnet-beta'))
const connection = new Connection(API_ENDPOINT);

// 定义ANSI转义序列来设置绿色和重置颜色
const green = '\x1b[32m';
const reset = '\x1b[0m';


/**
 * 获取报价
 * @param tokenA 
 * @param tokenB 
 * @param amount tokenA的数量要做decimals运算
 * @returns 
 */
export async function quote(tokenA: string, tokenB: string, amount: number) {
    const quote = await jupiterQuoteApi.quoteGet({
        inputMint: tokenA,
        outputMint: tokenB,
        amount: amount,
        slippageBps: Number(EnvConfig.get(EnvKeys.SLIPPAGE_BPS, "50")),
        onlyDirectRoutes: false,
        asLegacyTransaction: false,
    });
    //console.log(quote)
    if (!quote) {
        console.error("unable to quote");
        return;
    }
    return quote;

}

export async function swap(quote: QuoteResponse) {
    // Get serialized transaction
    const swapResult = await jupiterQuoteApi.swapPost({
        swapRequest: {
            quoteResponse: quote,
            userPublicKey: wallet.publicKey.toBase58(),
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: "auto",
            // prioritizationFeeLamports: {
            //   autoMultiplier: 2,
            // },
        },
    });

    //console.dir(swapResult, { depth: null });

    // Serialize the transaction
    const swapTransactionBuf = Buffer.from(swapResult.swapTransaction, "base64");
    var transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // Sign the transaction
    transaction.sign([wallet.payer]);
    const signature = getSignature(transaction);

    // We first simulate whether the transaction would be successful
    const { value: simulatedTransactionResponse } =
        await connection.simulateTransaction(transaction, {
            replaceRecentBlockhash: true,
            commitment: "processed",
        });
    const { err, logs } = simulatedTransactionResponse;

    if (err) {
        // Simulation error, we can check the logs for more details
        // If you are getting an invalid account error, make sure that you have the input mint account to actually swap from.
        console.error("Simulation Error:");
        console.error({ err, logs });
        return false;
    }

    const serializedTransaction = Buffer.from(transaction.serialize());
    const blockhash = transaction.message.recentBlockhash;

    const transactionResponse = await transactionSenderAndConfirmationWaiter({
        connection,
        serializedTransaction,
        blockhashWithExpiryBlockHeight: {
            blockhash,
            lastValidBlockHeight: swapResult.lastValidBlockHeight,
        },
    });

    // If we are not getting a response back, the transaction has not confirmed.
    if (!transactionResponse) {
        console.error("Transaction not confirmed");
        return false;
    }

    if (transactionResponse.meta?.err) {
        console.error(transactionResponse.meta?.err);
        return false;
    }

    console.log("交易哈希 ", `https://solscan.io/tx/${signature}`);
    return true;
}

type Token = {
    symbol: string;
    address: string;
    decimals: number;
};

export async function downloadTokensList(): Promise<Token[]> {
    const response = await axios.get("https://token.jup.ag/all");
    const data: Token[] = response.data.map(({ symbol, address, decimals }: Token) => ({
        symbol,
        address,
        decimals,
    }));
    await fsPromises.writeFile("tokens.txt", JSON.stringify(data));
    return data;
}

export async function getTokens(): Promise<Token[]> {
    const exists = fs.existsSync("tokens.txt");
    if (!exists) {
        await downloadTokensList();
    }
    const tokensData = await fsPromises.readFile("tokens.txt", { encoding: 'utf-8' });
    return JSON.parse(tokensData) as Token[];
}

export async function getTokensObject(): Promise<{ [address: string]: Token }> {
    const tokens = await getTokens();
    const tokensObject: { [address: string]: Token } = {};
    for (const token of tokens) {
        tokensObject[token.address] = token;
    }
    return tokensObject;
}

/**
 * 这里的Token AB 不一定是和调用方法处是一致的
 * @param ids token A
 * @param vsToken token B
 * @returns tokenA(ids) 价值多少(vsToken) token B
 */
export async function getPrice(ids: string, vsToken: string): Promise<number | undefined> {
    const response = await axios.get(`https://price.jup.ag/v4/price?ids=${ids}&vsToken=${vsToken}`);
    const data = response.data.data;
    // 检查data是否存在，并且是否包含指定的id
    if (data && data[ids]) {
        const price = data[ids].price;
        return price;
    } else {
        // 如果data未定义或不包含指定的id，返回undefined
        return undefined;
    }
}
