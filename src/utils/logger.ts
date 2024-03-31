import * as fs from 'fs';
import * as path from 'path';

class Logger {
    private static instance: Logger;
    private logFilePath: string;

    private constructor() {
        // 设置日志文件的路径
        const logFileName = `${new Date().toISOString().replace(/-|T|:/g, '').slice(0, 12)}.log`;
        this.logFilePath = path.join(__dirname, 'logs', logFileName);

        // 确保logs目录存在
        const logsDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    // 记录日志
    log(message: string, level: string = 'INFO'): void {
        // 获取当前时间
        const timestamp = new Date().toLocaleString("zh", { hour12: false }).replace(/|/g, '');

        // 构建日志消息
        const logMessage = `[${timestamp}] [${level}] ${message}\n`;

        // 将日志消息写入文件
        fs.appendFile(this.logFilePath, logMessage, (err) => {
            if (err) {
                console.error(`Error writing to log file: ${err}`);
            }
        });

        // 同时输出到控制台
        console.log(logMessage.trim());
    }

    // 记录信息级别的日志
    info(message: string): void {
        this.log(message, 'INFO');
    }

    // 记录错误级别的日志
    error(message: string): void {
        this.log(message, 'ERROR');
    }

    // 记录警告级别的日志
    warn(message: string): void {
        this.log(message, 'WARN');
    }
}

export default Logger;
