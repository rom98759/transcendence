import { appenv } from "../config/env.js";
import { RedisManager } from "../data/um.redis.client.js";
import { REDIS } from "../utils/messages.js";

export async function initUserSubscribers(){
    const redis = RedisManager.getInstance();

    await redis.sub.subscribe(appenv.UM_REDIS_CHANNEL);
    redis.sub.on('message', async (channel: string, message: string) => {
        if (channel !== appenv.UM_REDIS_CHANNEL)
            return;
        const msg = JSON.parse(message);

        switch (msg.action) {
            case REDIS.MATCH_FINISHED:
                // TODO update history, ranking
                break;
        }
    });
}