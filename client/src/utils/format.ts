export function formatTokenCount(tokenCount: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(tokenCount))} tok`;
}

export function formatUsdCost(costValue: number): string {
  return `$${costValue.toFixed(2)}`;
}
