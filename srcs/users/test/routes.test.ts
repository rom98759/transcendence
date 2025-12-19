import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import fastify from "fastify";
import { umRoutes } from "../src/routes/um.routes.js";
import { API_ERRORS } from '../src/utils/messages.js';
import * as umService from "../src/services/um.service.js";
import * as mappers from "../src/utils/mappers.js";
import { afterEach } from 'node:test';
import { UserProfile } from 'src/data/generated/prisma/client.js';

// auto mock all functions from this file
// vi.mock("../src/services/um.service.js");
// vi.mock("../src/utils/mappers.js");

describe("GET /users/:username", () => {
    const app = fastify();

    beforeAll(async () => {
        app.register(umRoutes);
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const mockProfile = { id: 1, authId: 1, username: "toto", email: "toto@test.com", createdAt: new Date(), avatarUrl: "avatars/default.png" };
    const mockProfileDTO = { username: "toto", avatarUrl: "avatars/default.png"};

    test("GET /users/:username - Should return user profile", async () => {
        vi.spyOn(umService, 'findByUsername').mockResolvedValue(mockProfile as UserProfile);
        vi.spyOn(mappers, 'mapProfileToDTO').mockReturnValue(mockProfileDTO);

        const response = await app.inject({
            method: 'GET',
            url: "/users/toto"
        });

        expect(umService.findByUsername).toHaveBeenCalledWith("toto");
        expect(mappers.mapProfileToDTO).toHaveBeenCalledWith(mockProfile);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.payload)).toEqual({
            profile: expect.objectContaining({
                username: "toto"
            })
        })
    });

    test("GET /users/:username - Should return 404 if not found", async () => {
        vi.spyOn(umService, 'findByUsername').mockResolvedValue(null);
        
        const response = await app.inject({
            method: 'GET',
            url: "/users/unknown"
        });

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.payload)).toEqual({
                message: API_ERRORS.USER.NOT_FOUND
        });
    });

    test("GET /users/:username - Should reject admin as username", async () => {

        const response = await app.inject({
            method: 'GET',
            url: "/users/admin"
        });

        expect(response.statusCode).toBe(400);

        const body = JSON.parse(response.payload);
        expect(body.error).toBe(API_ERRORS.USER.INVALID_FORMAT);
    });

    test("GET /users/:username - Should return 500 if service throws error", async () => {
        vi.spyOn(umService, 'findByUsername').mockRejectedValue(new Error(API_ERRORS.DB.CONNECTION_ERROR));
        
        const response = await app.inject({
            method: 'GET',
            url: "/users/unknown"
        });

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.payload)).toEqual(expect.objectContaining({
                error: "Internal Server Error",
                message: API_ERRORS.DB.CONNECTION_ERROR,
        }));
    });
})