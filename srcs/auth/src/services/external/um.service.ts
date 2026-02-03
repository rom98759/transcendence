import { logger } from '../../index.js';
import { CreateProfileDTO, UserProfileDTO } from '../../types/dto.js';
import { ServiceError } from '../../types/errors.js';
import { EVENTS, REASONS, UM_SERVICE_URL } from '../../utils/constants.js';
import { APP_ERRORS } from '../../utils/error-catalog.js';
import { ERROR_CODES } from '@transcendence/core';
import { mtlsAgent } from '../../utils/mtlsAgent.js';
import { MTLSRequestInit } from '../../types/https.js';

export async function createUserProfile(payload: CreateProfileDTO): Promise<UserProfileDTO> {
  try {
    logger.info({ msg: `calling POST ${UM_SERVICE_URL}/`, payload: payload });

    // Configuration de la requête avec l'agent mTLS
    const init: MTLSRequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': String(payload.authId) || '',
        'x-user-name': (payload.username as string) || '',
      },
      body: JSON.stringify(payload),
      dispatcher: mtlsAgent,
    };
    const response = await fetch(`${UM_SERVICE_URL}/`, init);

    if (!response.ok) {
      const errorText = await response.text();

      // Preserve upstream status (400/409/422/5xx) and message to avoid fake timeouts
      let parsedMessage = 'Upstream service error';
      try {
        const parsed = JSON.parse(errorText);
        parsedMessage = parsed?.message || parsedMessage;
      } catch {
        // keep fallback
      }

      throw new ServiceError(
        {
          code: ERROR_CODES.INTERNAL_ERROR,
          event: EVENTS.DEPENDENCY.FAIL,
          statusCode: response.status,
          reason: REASONS.NETWORK.UPSTREAM_ERROR,
          message: parsedMessage,
        },
        { originalError: { status: response.status, body: errorText } },
      );
    }

    return (await response.json()) as UserProfileDTO;
  } catch (error) {
    logger.error({ msg: `error POST ${UM_SERVICE_URL}/users`, error: error });
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(APP_ERRORS.SERVICE_UNAVAILABLE, { originalError: error });
  }
}
