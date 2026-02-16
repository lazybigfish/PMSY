import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化金额，自动换算单位（万、千万、亿）
 * @param amount 金额（元）
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的金额字符串
 */
export function formatAmount(amount: number, decimals: number = 2): string {
  if (amount === 0) return '¥0'
  
  const absAmount = Math.abs(amount)
  
  // 亿以上
  if (absAmount >= 100000000) {
    const value = (amount / 100000000).toFixed(decimals)
    return `¥${parseFloat(value)}亿`
  }
  
  // 千万以上
  if (absAmount >= 10000000) {
    const value = (amount / 10000000).toFixed(decimals)
    return `¥${parseFloat(value)}千万`
  }
  
  // 万以上
  if (absAmount >= 10000) {
    const value = (amount / 10000).toFixed(decimals)
    return `¥${parseFloat(value)}万`
  }
  
  // 万元以下，显示原始金额
  return `¥${amount.toLocaleString()}`
}

/**
 * 金额转中文大写
 * @param num 金额数字
 * @returns 中文大写金额字符串
 */
export function numberToChinese(num: number): string {
  if (num === 0) return '零元整';

  const chineseNums = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const chineseUnits = ['', '拾', '佰', '仟'];
  const chineseBigUnits = ['', '万', '亿', '兆'];

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = '';

  if (integerPart > 0) {
    const unitGroups: number[] = [];
    let temp = integerPart;
    while (temp > 0) {
      unitGroups.push(temp % 10000);
      temp = Math.floor(temp / 10000);
    }

    for (let i = unitGroups.length - 1; i >= 0; i--) {
      const group = unitGroups[i];
      if (group === 0) continue;

      let groupStr = '';
      const digits = [
        Math.floor(group / 1000),
        Math.floor((group % 1000) / 100),
        Math.floor((group % 100) / 10),
        group % 10
      ];

      let lastZero = false;
      for (let j = 0; j < 4; j++) {
        const digit = digits[j];
        if (digit === 0) {
          lastZero = true;
        } else {
          if (lastZero && result.length > 0) {
            groupStr += '零';
          }
          groupStr += chineseNums[digit] + chineseUnits[3 - j];
          lastZero = false;
        }
      }

      result += groupStr + chineseBigUnits[i];
    }

    result += '元';
  }

  if (decimalPart === 0) {
    result += '整';
  } else {
    const jiao = Math.floor(decimalPart / 10);
    const fen = decimalPart % 10;

    if (jiao > 0) {
      result += chineseNums[jiao] + '角';
    }
    if (fen > 0) {
      result += chineseNums[fen] + '分';
    }
  }

  return result;
}
