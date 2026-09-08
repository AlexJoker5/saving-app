export const isDisplayMonth = (value: string) =>
  /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value);
export const monthNumber = (value: string) => {
  const [year, month] = value.split('-').map(Number);

  return year * 12 + month - 1;
};
export const shiftMonth = (value: string, count: number) => {
  const serial = monthNumber(value) + count;

  return `${String(Math.floor(serial / 12)).padStart(4, '0')}-${String((serial % 12) + 1).padStart(2, '0')}`;
};
