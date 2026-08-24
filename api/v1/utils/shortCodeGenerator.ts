import { Snowflake } from "@theinternetfolks/snowflake";
import encodeBase62 from "./encoder";

export function generateShortCode(): string {
    const workerId = Number(process.env.WORKER_ID || 1);

    // 1. Ask Snowflake for 1 unique 64-bit ID string
    const snowflakeIdStr = Snowflake.generate({ shard_id: workerId });

    // 2. Convert to BigInt and encode to Base62
    const shortCode = encodeBase62(BigInt(snowflakeIdStr));

    // 3. Return fixed 7-character string
    return shortCode.slice(-7);
}