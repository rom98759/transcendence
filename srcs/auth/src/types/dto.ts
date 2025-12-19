export interface CreateProfileDTO {
  authId: number;
  email: string;
  username: string;
}

export interface UserProfileDTO {
  username: string
  avatarUrl: string
}
