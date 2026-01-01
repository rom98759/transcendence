import * as friendsData from '../data/friends.data.js';
import * as umData from '../data/um.data.js';

export async function addFriend(userId: number, friendId: number) {
  const userExists = await umData.findUserById(userId);
  const friendExists = await umData.findUserById(friendId);

  if (!userExists || !friendExists) {
    throw new Error('One or both users do not exist');
  }

  const existingFriendship = await friendsData.findFriendship(userId, friendId);
  if (existingFriendship) {
    throw new Error('Friendship already exists');
  }

  const friendCount = await friendsData.countFriends(userId);
  if (friendCount >= 10) {
    throw new Error('Friend limit reached');
  }

  return await friendsData.createFriendship(userId, friendId);
}

export async function getFriendsByUserId(userId: number) {
  const friendships = await friendsData.findFriendshipsByUser(userId);

  return friendships.map((f: any) => {
    const friendProfile = f.userId === userId ? f.friend : f.user;
    return {
      id: f.id,
      userId: friendProfile.id,
      username: friendProfile.username,
      avatar_url: friendProfile.avatarUrl,
      createdAt: f.createdAt,
      nickname: f.nickname,
    };
  });
}

export async function removeFriend(userId: number, targetId: number) {
  const friendship = await friendsData.findFriendshipAnyDirection(userId, targetId);

  if (!friendship) {
    return null;
  }

  return await friendsData.deleteFriendshipById(friendship.id);
}

export async function updateFriend(userId: number, targetId: number, _nickname: string) {
  const friendship = await friendsData.findFriendshipAnyDirection(userId, targetId);
  if (!friendship) {
    return null;
  }
  return await friendsData.updateFriendshipNickname(friendship.id, _nickname);
}
