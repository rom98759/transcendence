import { UserProfile } from "src/data/generated/prisma/client";
import { UserProfileDTO } from "src/types/user-profile";

export function mapProfileToDTO(profile: UserProfile): UserProfileDTO {
    return {
        username: profile.username,
        avatarUrl: profile.avatarUrl
    }
}