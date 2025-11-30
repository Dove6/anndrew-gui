export const nanToZero = (n: number) => isNaN(n) ? 0 : n;
export const clamp = (n: number, min: number, max: number) => (n < min) ? min : ((n > max) ? max : n);
export const mod = (n: number, m: number) => ((n % m) + m) % m;
export const removeWhitespaces = (s: string) => s.replace(/\s+/g, '');
export const toFloat = (a: any) => nanToZero(parseFloat(a));
export const toInteger = (a: any) => Math.round(toFloat(a));
export const parseOpacity = (opacity: string) => clamp(Math.round(toFloat(opacity) * 2.55), 0, 255);
export const stringifyOpacity = (opacity: number) => (opacity / 2.55).toFixed(2).replace(/(\.0)?0$/, '');
