// "1 Day", "5 Days", "1 Month".
export const tierName = (days: number) => (days === 30 ? "1 Month" : `${days} ${days === 1 ? "Day" : "Days"}`);

// "1 client", "3 clients".
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
