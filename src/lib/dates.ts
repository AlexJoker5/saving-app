export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Yangon',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export const currentMonth = () => today().slice(0, 7);
export const addMonths = (month: string, count: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + count, 1));

  return d.toISOString().slice(0, 7);
};
export const monthName = (month: string, short = false) =>
  new Intl.DateTimeFormat('en', {
    month: short ? 'short' : 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(month + '-01T00:00:00Z'));
