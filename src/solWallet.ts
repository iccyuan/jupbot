import {
    Connection,
    PublicKey,
    Keypair,
    clusterApiUrl
} from '@solana/web3.js';
import EnvConfig from './envConfig';
import EnvKeys from './envKeys';
import { Wallet } from "@project-serum/anchor";
import bs58 from "bs58";
import solanaWeb3 from '@solana/web3.js';
import { getPrice, getTokens } from './jupapi'
import { TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token';

// 创建连接
const connection = new Connection(EnvConfig.get(EnvKeys.API_ENDPOINT, clusterApiUrl('mainnet-beta')), 'confirmed');
const wallet = new Wallet(
    Keypair.fromSecretKey(bs58.decode(EnvConfig.getMandatory(EnvKeys.PRIVATE_KEY)))
);
const USDC_MINT_ADDRESS = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112";

export interface TokenValue {
    tokenMint: string;
    valueInUSDC: number;
}

export async function getPublicKey(): Promise<string> {
    return wallet.publicKey.toBase58();
}

async function getTokenAccounts(connection: Connection, address: PublicKey, tokenMintAddress: solanaWeb3.PublicKeyInitData) {
    return await connection.getParsedTokenAccountsByOwner(
        address,
        {
            mint: new solanaWeb3.PublicKey(tokenMintAddress)
        }
    );
}

export async function getTokenBalance(tokenMintAddress: string): Promise<number> {
    if (SOL_MINT_ADDRESS === tokenMintAddress) {
        const lamports = await connection.getBalance(wallet.publicKey);
        const solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;
        //console.log(solBalance)
        return solBalance;
    } else {
        const tokenAccounts = await getTokenAccounts(
            connection,
            wallet.publicKey,
            tokenMintAddress,
        );
        if (tokenAccounts.value.length > 0) {
            const balance =
                tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
            //console.log(balance)
            return balance;
        }

    }
    return 0;
}

type BalanceInfo = {
    sol: number;
    usdc: number;
    token: number;
    solPrice: number | undefined;
    tokenPrice: number | undefined;

}

export async function getBalanceInfo(mintAddress: string): Promise<BalanceInfo> {
    //Sol数量
    const sol = await getTokenBalance(SOL_MINT_ADDRESS)
    //USDC数量
    const usdc = await getTokenBalance(USDC_MINT_ADDRESS)
    //Token数量,交易对中的另外一个token
    const token = await getTokenBalance(mintAddress)
    //Sol价格
    const solPrice = await getPrice(SOL_MINT_ADDRESS, USDC_MINT_ADDRESS);
    //Token价格
    const tokenPrice = await getPrice(mintAddress, USDC_MINT_ADDRESS);
    return { sol, usdc, token, solPrice, tokenPrice }
}

export async function getTokenDecimals(tokenMintAddress: string): Promise<number> {
    // 将代币的mint地址转换为PublicKey
    const mintPublicKey = new PublicKey(tokenMintAddress);
    // 使用getMint函数获取代币的信息
    const mintInfo = await getMint(connection, mintPublicKey);
    // 从mintInfo中获取decimals
    const decimals = mintInfo.decimals;
    return decimals;
}

