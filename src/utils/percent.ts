export const makePercent = (num: number) => {
  const percent = num * 100;
  return Math.ceil(percent * 100) / 100;
};
