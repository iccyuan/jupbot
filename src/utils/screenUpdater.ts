import * as readline from 'readline';

// 清空屏幕
export function clearScreen(): void {
    process.stdout.write('\x1Bc');
}

// 移动光标到指定位置（行，列）
export function moveTo(line: number, column: number): void {
    readline.cursorTo(process.stdout, column, line);
}

// 更新屏幕内容
export const updateScreen = (content: string): void => {
    clearScreen(); // 清空屏幕
    moveTo(0, 0); // 将光标移动到屏幕左上角
    process.stdout.write(content); // 输出新内容
}