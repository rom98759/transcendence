import { logger } from '../../index.js';
import { CreateProfileDTO, UserProfileDTO } from '../../types/dto.js';
import { ServiceError } from '../../types/errors.js';
import { UM_SERVICE_URL } from '../../utils/constants.js';
import { APP_ERRORS } from '../../utils/error-catalog.js';

export async function createUserProfile(payload: CreateProfileDTO): Promise<UserProfileDTO> {
  try {
    logger.info({ msg: `calling POST ${UM_SERVICE_URL}/`, payload: payload });
    const response = await fetch(`${UM_SERVICE_URL}/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(payload.authId),
        'x-user-name': payload.username,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ServiceError(APP_ERRORS.SERVICE_BAD_GATEWAY, {
        originalError: { status: response.status, body: errorText },
      });
    }
    return (await response.json()) as UserProfileDTO;
  } catch (error) {
    logger.error({ msg: `error POST ${UM_SERVICE_URL}/users`, error: error });
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(APP_ERRORS.SERVICE_UNAVAILABLE, { originalError: error });
  }
}
