import * as fs from 'fs';
import * as path from 'path';

export async function formatDate(date: Date): Promise<string> {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export async function formatTimeDifference(time1: number, time2: number): Promise<string> {
    // 计算时间差（以毫秒为单位）
    let difference = Math.abs(time1 - time2);
    // 将时间差转换为小时
    let hours = Math.floor(difference / (1000 * 60 * 60));
    difference -= hours * (1000 * 60 * 60);
    // 将剩余时间转换为分钟
    let minutes = Math.floor(difference / (1000 * 60));
    difference -= minutes * (1000 * 60);
    // 将剩余时间转换为秒
    let seconds = Math.floor(difference / 1000);
    // 计算天数
    let days = Math.floor(hours / 24);
    hours %= 24;
    // 格式化为字符串
    let formattedTime = `${days}天${hours}小时${minutes}分${seconds}秒`;
    return formattedTime;
}

export function roundToDecimal(num: number, decimalPlaces: number): number {
    const factor = Math.pow(10, decimalPlaces);
    return Math.round(num * factor) / factor;
}

export async function getVersion() {
    // 获取 package.json 文件的路径
    const packageJsonPath = path.resolve(__dirname, '..', '../package.json');
    // 读取 package.json 文件
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf-8');
    // 解析 JSON 内容
    const packageJson = JSON.parse(packageJsonContent);
    // 获取版本信息
    const version: string = packageJson.version;
    return version;
}