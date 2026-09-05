export const money = (n: number) => new Intl.NumberFormat('en-US').format(n);
export const compact = (n: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(n);
