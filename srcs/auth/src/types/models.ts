export interface DBUser {
  id?: number;
  username: string;
  email?: string | null;
  password: string;
  role: string;
  is_2fa_enabled?: number;
  totp_secret?: string | null;
}
