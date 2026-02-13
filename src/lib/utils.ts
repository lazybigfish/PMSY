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
