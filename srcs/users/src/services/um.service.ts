import * as data from '../data/um.data.js'

export async function findByUsername(username: string) {
  return await data.findProfileByUsername(username)
}

export async function createProfile(
  authId: number,
  email: string,
  username: string
) {
  return await data.createProfile({ authId, email, username })
}
