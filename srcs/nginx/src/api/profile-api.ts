import { ProfileSimpleDTO, usernameDTO, usernameSchema } from '@transcendence/core';
import api from './api-client';

export const profileApi = {
  getMe: async (username: usernameDTO): Promise<ProfileSimpleDTO> => {
    usernameSchema.parse(username);
    const { data } = await api.get(`/users/username/${username}`);
    return { ...data };
  },

  getProfileByUsername: async (username: usernameDTO): Promise<ProfileSimpleDTO> => {
    usernameSchema.parse(username);
    const { data } = await api.get(`/users/username/${username}`);
    return { ...data };
  },

  updateAvatar: async (
    username: usernameDTO,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<ProfileSimpleDTO> => {
    usernameSchema.parse(username);

    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.patch(`/users/username/${username}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return { ...data };
  },

  deleteProfile: async (username: usernameDTO): Promise<ProfileSimpleDTO> => {
    usernameSchema.parse(username);
    const { data } = await api.delete(`/users/username/${username}`);
    return { ...data };
  },
};
