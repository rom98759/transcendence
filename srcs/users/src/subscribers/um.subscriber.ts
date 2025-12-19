import { appenv } from "src/config/env";
import { RedisManager } from "src/data/um.redis.client";
import { REDIS } from "src/utils/messages";

export async function initUserSubscribers(){
    const redis = RedisManager.getInstance();

    await redis.sub.subscribe(appenv.UM_REDIS_CHANNEL);
    redis.sub.on('message', async (channel, message) => {
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