export const API_ERRORS = {
    USER: {
        BAD_REQUEST: "Bad Request",
        NOT_FOUND: "User not found",
        INVALID_FORMAT: "Invalid format",
        ADMIN_FORBIDDEN: "Admin username is restricted",
        CREATE_FAILED: "Profile might already exist. Or an error occurred during creation",
    },
    DB: {
        CONNECTION_ERROR: "Database connection failed"
    },
    REDIS: {
        BASE: "Redis Error",
        PROCESS: "Error processing Redis message",
        CONNECT: "Redis failed to connect after all possible retries",
        CONNECT_RETRY: "Redis failed to connect.. Retrying",
    },
    UNKNOWN: "Unknown error"
} as const;

export const LOG_EVENTS = {
    INVALID_REQUEST: "invalid_request",
    GET_PROFILE_BY_USERNAME: "get_profile_by_username",
    CREATE_PROFILE: "create_profile",
    REDIS_CONNECT: "Redis connected",
}

export const REDIS = {
    MATCH_FINISHED: "match_finished"
}
