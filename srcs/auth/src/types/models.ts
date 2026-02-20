export interface DBUser {
  id?: number;
  username: string;
  email?: string | null;
  password: string;
  role: string;
  is_2fa_enabled?: number;
  totp_secret?: string | null;
  google_id?: string | null;
  school42_id?: string | null;
  oauth_email?: string | null;
  avatar_url?: string | null;
  created_at?: string;
}
