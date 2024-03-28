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