import { encode } from 'iconv-lite'

const encoder = {
    encode: (input: string) => encode(input, 'windows-1250'),
}
const decoder = new TextDecoder('windows-1250');

export const nanToZero = (n: number) => isNaN(n) ? 0 : n;
export const clamp = (n: number, min: number, max: number) => (n < min) ? min : ((n > max) ? max : n);
export const mod = (n: number, m: number) => ((n % m) + m) % m;
export const removeWhitespaces = (s: string) => s.replace(/\s+/g, '');
export const toFloat = (a: unknown) => nanToZero(parseFloat(`${a}`.trim()));
export const toInteger = (a: unknown) => Math.round(toFloat(a));
export const parseOpacity = (opacity: string) => clamp(Math.round(toFloat(opacity) * 2.55), 0, 255);
export const stringifyOpacity = (opacity: number) => (opacity / 2.55).toFixed(2).replace(/(\.0)?0$/, '');

/**
 * Checks an event name for errors.
 * @param eventName Validate event name.
 * @param otherNames Names of other existing events.
 * @returns Validation error string or undefined.
 */
export const validateEventName = (eventName: string, otherNames: string[]) => {
    if (eventName.length < 1 || eventName.length > 32) {
        return 'Event name length must be between 1 and 32 characters!';
    } else if (/[\s=^\/#!:]/.test(eventName)) {
        return 'Event name cannot contain spaces or any of: !#^=:/'
    } else if (eventName !== decoder.decode(encoder.encode(eventName))) {
        return 'Event name must only consist of windows-1250 characters!';
    } else if (otherNames.indexOf(eventName) >= 0) {
        return 'Event name must be unique!';
    }
};
