export const API_ERRORS = {
    USER: {
        NOT_FOUND: "User not found",
        INVALID_FORMAT: "Invalid format",
        ADMIN_FORBIDDEN: "Admin username is restricted",
        CREATE_FAILED: "Profile might already exist. Or an eror occurred during creation",
    },
    DB: {
        CONNECTION_ERROR: "Database connection failed"
    }
} as const;

export const LOG_EVENTS = {
    INVALID_REQUEST: "invalid_request",
    GET_PROFILE_BY_USERNAME: "get_profile_by_username",
    CREATE_PROFILE: "create_profile"
}