export const API_ERRORS = {
  USER: {
    BAD_REQUEST: 'Bad Request',
    NOT_FOUND: 'User not found',
    INVALID_FORMAT: 'Invalid format',
    ADMIN_FORBIDDEN: 'Admin username is restricted',
    CREATE_FAILED: 'Profile might already exist. Or an error occurred during creation',
    FRIEND: {
      ALREADY_FRIENDS: 'The users are already friends',
      ADD_FAILED: 'Failed to add friend',
      DELETE_FAILED: 'Failed to remove friend',
      NOT_FRIENDS: 'The users are not friends',
    },
  },
  DB: {
    CONNECTION_ERROR: 'Database connection failed',
  },
  REDIS: {
    BASE: 'Redis Error',
    PROCESS: 'Error processing Redis message',
    CONNECT: 'Redis failed to connect after all possible retries',
    CONNECT_RETRY: 'Redis failed to connect.. Retrying',
  },
  UNKNOWN: 'Unknown error',
} as const;

export const REDIS = {
  MATCH_FINISHED: 'match_finished',
};
