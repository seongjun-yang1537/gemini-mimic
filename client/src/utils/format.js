export function formatTokenCount(tokenCount) {
    return `${new Intl.NumberFormat('ko-KR').format(Math.round(tokenCount))} tok`;
}
export function formatUsdCost(costValue) {
    return `$${costValue.toFixed(2)}`;
}
