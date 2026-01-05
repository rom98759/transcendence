/**
 * @transcendence/core
 * Shared library for services
 * @example
 * // import specific items
 * import { AppError } from "@transcendence/core";
 * import * as Core from "@transcendence/core";
 * Core.ERR_DEFS.PROFILE_NOT_FOUND
 */

// ============================================================================
// Constants
// ============================================================================

export { RequestStatus, CONFIG } from './constants/index.js';

// ============================================================================
// Errors
// ============================================================================

export { ERR_DEFS } from './errors/error-catalog.js';

export { AppError, type ErrorDefinition, type ErrorCode } from './errors/error-types.js';

// ============================================================================
// Logging
// ============================================================================

export { LOG_EVENTS, LOG_REASONS, LOG_ACTIONS, LOG_RESOURCES } from './logging/logging.js';

export { type LogContext, type EventValue, type ReasonValue } from './logging/logging-types.js';

// ============================================================================
// Zod Schemas
// ============================================================================

export { IdSchema } from './schemas/base.schema.js';
export { UserNameSchema } from './schemas/user.schema.js';
export { ProfileSchema, ProfileCreateInSchema } from './schemas/profile.schema.js';
export {
  FriendshipFullSchema,
  FriendshipUnifiedSchema,
  FriendshipUpdateStatusSchema,
  FriendshipUpdateNicknameSchema,
} from './schemas/friend.schema.js';
export {
  SimpleErrorWithMessageSchema,
  DetailedErrorSchema,
  ValidationErrorSchema,
} from './schemas/error.schema.js';

// ============================================================================
// DTO (TS types)
// ============================================================================

export type { IdDTO, targetUserIdDTO, statusUpdateDTO } from './schemas/base.schema.js';
export type { UserNameDTO, UserRequestDTO } from './schemas/user.schema.js';
export type {
  FriendshipFullDTO,
  FriendshipUnifiedDTO,
  FriendshipReceiverDTO,
  FriendshipRequesterDTO,
  FriendshipUpdateStatusDTO,
  FriendshipUpdateNicknameDTO,
} from './schemas/friend.schema.js';
export type { ProfileDTO, ProfileDataDTO, ProfileCreateInDTO } from './schemas/profile.schema.js';
