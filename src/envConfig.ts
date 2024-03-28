// EnvConfig.ts

import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

class EnvConfig {
  // 获取环境变量，提供默认值
  static get(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value !== undefined) {
      return value;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`环境变量 ${key} 未设置`);
  }

  // 获取必须的环境变量，如果未设置则抛出错误
  static getMandatory(key: string): string {
    const value = this.get(key);
    if (value === undefined) {
      throw new Error(`必须的环境变量 ${key} 未设置`);
    }
    return value;
  }
}


export default EnvConfig;
