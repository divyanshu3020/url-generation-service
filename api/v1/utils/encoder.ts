const BASE62:string = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function encodeBase62(num: bigint): string {
    if (num === 0n) return BASE62.charAt(0);
    let encoded = "";
    while (num > 0n) {
        const remainder = Number(num % 62n);
        encoded = BASE62.charAt(remainder) + encoded;
        num = num / 62n;
    }
    return encoded;
}