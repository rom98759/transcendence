export interface DBUser {
  id?: number
  username: string
  email?: string | null
  password: string
  role: string
}