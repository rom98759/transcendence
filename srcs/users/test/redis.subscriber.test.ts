import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import { USER_EVENT } from '@transcendence/core';

vi.mock('../src/services/profiles.service.js', () => ({
  profileService: {
    getProfileByIdOrThrow: vi.fn(),
  },
}));

import { profileService } from '../src/services/profiles.service.js';
import { initRedisSubscriber } from '../src/events/redis.subscriber.js';
import { userBus } from '../src/events/user.bus.js';

type FastifyMock = FastifyInstance & {
  redis: { xadd: ReturnType<typeof vi.fn> };
  log: {
    debug: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
};

const flushEventHandlers = async () => {
  await new Promise((resolve) => setImmediate(resolve));
};

describe('initRedisSubscriber', () => {
  let fastify: FastifyMock;

  beforeEach(() => {
    userBus.removeAllListeners();
    fastify = {
      redis: { xadd: vi.fn() },
      log: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    } as unknown as FastifyMock;

    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    userBus.removeAllListeners();
  });

  it('streams USER_CREATED event on USER_EVENT.CREATED', async () => {
    initRedisSubscriber(fastify);

    userBus.emit(USER_EVENT.CREATED, { authId: 1, username: 'toto' });
    await flushEventHandlers();

    expect(fastify.redis.xadd).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(vi.mocked(fastify.redis.xadd).mock.calls[0][3] as string);
    expect(payload).toEqual({
      type: 'USER_CREATED',
      id: 1,
      username: 'toto',
      timestamp: 1700000000000,
    });
  });

  it('logs error if USER_CREATED stream fails', async () => {
    vi.mocked(fastify.redis.xadd).mockRejectedValueOnce(new Error('redis down'));
    initRedisSubscriber(fastify);

    userBus.emit(USER_EVENT.CREATED, { authId: 1, username: 'toto' });
    await flushEventHandlers();

    expect(fastify.log.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to stream user event to Redis',
    );
  });

  it('streams USER_UPDATED event on USER_EVENT.UPDATED', async () => {
    vi.mocked(profileService.getProfileByIdOrThrow).mockResolvedValue({
      authId: 1,
      username: 'toto',
      avatarUrl: '/uploads/avatar.png',
    });
    initRedisSubscriber(fastify);

    userBus.emit(USER_EVENT.UPDATED, 1);
    await flushEventHandlers();

    expect(profileService.getProfileByIdOrThrow).toHaveBeenCalledWith(1);
    expect(fastify.redis.xadd).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(vi.mocked(fastify.redis.xadd).mock.calls[0][3] as string);
    expect(payload).toEqual({
      type: 'USER_UPDATED',
      id: 1,
      username: 'toto',
      avatar: '/uploads/avatar.png',
      timestamp: 1700000000000,
    });
  });

  it('logs warn and skips stream when updated profile is missing', async () => {
    vi.mocked(profileService.getProfileByIdOrThrow).mockRejectedValueOnce(new Error('not found'));
    initRedisSubscriber(fastify);

    userBus.emit(USER_EVENT.UPDATED, 42);
    await flushEventHandlers();

    expect(fastify.redis.xadd).not.toHaveBeenCalled();
    expect(fastify.log.warn).toHaveBeenCalledWith(
      'Profile not found for auth id 42, skipping Redis event',
    );
  });

  it('logs error when USER_UPDATED stream fails', async () => {
    vi.mocked(profileService.getProfileByIdOrThrow).mockResolvedValue({
      authId: 5,
      username: 'alice',
      avatarUrl: null,
    });
    vi.mocked(fastify.redis.xadd).mockRejectedValueOnce(new Error('xadd failed'));
    initRedisSubscriber(fastify);

    userBus.emit(USER_EVENT.UPDATED, 5);
    await flushEventHandlers();

    expect(fastify.log.error).toHaveBeenCalledWith(
      expect.any(Error),
      'Failed to stream user event to Redis',
    );
  });

  it('streams USER_DELETED and warns when stream fails', async () => {
    initRedisSubscriber(fastify);

    userBus.emit(USER_EVENT.DELETED, 10);
    await flushEventHandlers();

    expect(fastify.redis.xadd).toHaveBeenCalledTimes(1);
    let payload = JSON.parse(vi.mocked(fastify.redis.xadd).mock.calls[0][3] as string);
    expect(payload).toEqual({
      type: 'USER_DELETED',
      id: 10,
      timestamp: 1700000000000,
    });

    vi.mocked(fastify.redis.xadd).mockRejectedValueOnce(new Error('xadd failed'));

    userBus.emit(USER_EVENT.DELETED, 10);
    await flushEventHandlers();

    payload = JSON.parse(vi.mocked(fastify.redis.xadd).mock.calls[1][3] as string);
    expect(payload).toEqual({
      type: 'USER_DELETED',
      id: 10,
      timestamp: 1700000000000,
    });
    expect(fastify.log.warn).toHaveBeenCalledWith(
      'Profile not found for auth id 10, skipping Redis event',
    );
  });
});
