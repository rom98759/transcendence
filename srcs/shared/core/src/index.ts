/**
 * @abstract namespace exports
 * @example usage `import { Schemas } from "@transcendence/core";`
 */
// export * as Schemas from "./schemas/profile.schema.js";
// export * as Constants from "./constants/index.js"

export {
  UsernameParams,
  Profile,
  ProfileCreateIn,
} from "./schemas/profile.schema.js";

// Re-export DTO types for consumer convenience
export type {
  UsernameParamsDTO,
	ProfileDTO,
	ProfileCreateInDTO,
} from "./schemas/profile.schema.js";
