import { CreateProfileDTO, UserProfileDTO } from "../../types/dto.js";
import { ServiceError } from "../../types/errors.js";
import { UM_SERVICE_URL } from "../../utils/constants.js";
import { APP_ERRORS } from "../../utils/error-catalog.js";

export async function createUserProfile(payload: CreateProfileDTO): Promise<UserProfileDTO> {
    try {
        const response = await fetch(`${UM_SERVICE_URL}/users`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json',},
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new ServiceError(APP_ERRORS.SERVICE_BAD_GATEWAY, {originalError: {status: response.status, body: errorText }});
        }
        return await response.json() as UserProfileDTO;
    } catch (error) {
        if (error instanceof ServiceError) throw error;
        throw new ServiceError(APP_ERRORS.SERVICE_UNAVAILABLE, {originalError: error});
    }
}