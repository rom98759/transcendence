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

export { RequestStatus, CONFIG, HTTP_STATUS } from './constants/index.js';

// ============================================================================
// Errors
// ============================================================================

export { ERR_DEFS } from './errors/error-catalog.js';
export { ERROR_CODES } from './errors/error-codes.js';

export {
  AppError,
  FrontendError,
  type FrontendReasonValue,
  type ErrorDetail,
  type ErrorDefinition,
  type ErrorCode,
  type HttpStatus,
  mapZodIssuesToErrorDetails,
  mapToFrontendError,
} from './errors/error-types.js';

// ============================================================================
// Logging
// ============================================================================

export { LOG_EVENTS, LOG_REASONS, LOG_ACTIONS, LOG_RESOURCES } from './logging/logging.js';

export { type LogContext, type EventValue, type ReasonValue } from './logging/logging-types.js';

// ============================================================================
// Zod Schemas
// ============================================================================

export {
  idSchema,
  usernameSchema,
  emailSchema,
  passwordSchema,
  IdSchema,
  UserRoleSchema,
} from './schemas/base.schema.js';
export { UserNameSchema } from './schemas/user.schema.js';
export {
  UserSchema,
  UserFullSchema,
  UserLoginSchema,
  UserRegisterSchema,
} from './schemas/auth.schema.js';
export {
  // ProfileSchema,
  ProfileSimpleSchema,
  ProfileCreateInSchema,
} from './schemas/profile.schema.js';
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

export type {
  UserRole,
  idDTO,
  usernameDTO,
  emailDTO,
  IdDTO,
  RoleDTO,
  TargetUserIdDTO as targetUserIdDTO,
  statusUpdateDTO,
} from './schemas/base.schema.js';
export type { UserNameDTO, UserRequestDTO } from './schemas/user.schema.js';
export type { UserDTO, UserFullDTO, UserLoginDTO, UserRegisterDTO } from './schemas/auth.schema.js';
export type {
  FriendshipFullDTO,
  FriendshipUnifiedDTO,
  FriendshipReceiverDTO,
  FriendshipRequesterDTO,
  FriendshipUpdateStatusDTO,
  FriendshipUpdateNicknameDTO,
} from './schemas/friend.schema.js';
export type {
  ProfileDTO,
  ProfileSimpleDTO,
  ProfileWithAuthDTO,
  ProfileDataDTO,
  ProfileCreateInDTO,
} from './schemas/profile.schema.js';
export type {
  PlayerDTO,
  MatchToPlayDTO,
  TournamentDTO,
  TournamentResultDTO,
  TournamentMatchDTO,
  TournamentFullStateDTO,
  MatchSessionDTO,
} from './schemas/game.schema.js';

//=================================
// Enum and Interface
// ================================

export type { UserEvent } from './schemas/user.schema.js';
export { USER_EVENT } from './schemas/user.schema.js';
