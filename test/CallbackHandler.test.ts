import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type express from 'express';
import request from 'supertest';
import { createServer, type Server } from 'node:net';
import { CallbackHandler, type CallbackData, type Logger } from '../src/index.js';

vi.mock('@ngrok/ngrok', () => {
    const forward = vi.fn(async () => ({
        url: () => 'https://mock.ngrok.app',
        close: async () => {},
    }));
    const disconnect = vi.fn(async () => {});
    return { forward, disconnect };
});

// Access the private Express app for direct HTTP-layer testing.
const appOf = (h: CallbackHandler): express.Application =>
    (h as unknown as { app: express.Application }).app;

const makeLogger = (): Logger & { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> } => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
});

describe('CallbackHandler constructor validation', () => {
    it('throws if ngrokAuthToken is missing', () => {
        expect(
            () =>
                new CallbackHandler({
                    ngrokAuthToken: '',
                    onCallback: () => {},
                }),
        ).toThrow(/ngrokAuthToken is required/);
    });

    it('throws if onCallback is missing', () => {
        expect(
            () =>
                new CallbackHandler({
                    ngrokAuthToken: 'token',
                    // @ts-expect-error - intentionally omitting onCallback
                    onCallback: undefined,
                }),
        ).toThrow(/onCallback is required/);
    });

    it('accepts a handler without a logger', () => {
        expect(
            () =>
                new CallbackHandler({
                    ngrokAuthToken: 'token',
                    onCallback: () => {},
                }),
        ).not.toThrow();
    });
});

describe('CallbackHandler /callback route', () => {
    it('invokes onCallback with { queryParameters, body }', async () => {
        const onCallback = vi.fn();
        const handler = new CallbackHandler({
            ngrokAuthToken: 'token',
            onCallback,
        });

        await request(appOf(handler))
            .post('/callback')
            .query({ source: 'twilio' })
            .set('Content-Type', 'application/json')
            .send({ status: 'completed' })
            .expect(200);

        expect(onCallback).toHaveBeenCalledTimes(1);
        const payload = onCallback.mock.calls[0]?.[0] as CallbackData;
        expect(payload.queryParameters).toMatchObject({ source: 'twilio' });
        expect(payload.body).toEqual({ status: 'completed' });
    });

    it('normalizes application/x-www-form-urlencoded body to a plain JSON object', async () => {
        const onCallback = vi.fn();
        const handler = new CallbackHandler({
            ngrokAuthToken: 'token',
            onCallback,
        });

        await request(appOf(handler))
            .post('/callback')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send('CallSid=CA123&CallStatus=completed')
            .expect(200);

        const payload = onCallback.mock.calls[0]?.[0] as CallbackData;
        expect(payload.body).toEqual({ CallSid: 'CA123', CallStatus: 'completed' });
        expect(Object.getPrototypeOf(payload.body)).toBe(Object.prototype);
    });

    it('awaits async onCallback before responding 200', async () => {
        let resolved = false;
        const onCallback = vi.fn(async () => {
            await new Promise((r) => setTimeout(r, 50));
            resolved = true;
        });
        const handler = new CallbackHandler({
            ngrokAuthToken: 'token',
            onCallback,
        });

        await request(appOf(handler))
            .post('/callback')
            .send({ ok: true })
            .expect(200);

        expect(resolved).toBe(true);
    });

    it('returns 500 when onCallback throws', async () => {
        const onCallback = vi.fn(async () => {
            throw new Error('boom');
        });
        const logger = makeLogger();
        const handler = new CallbackHandler({
            ngrokAuthToken: 'token',
            onCallback,
            logger,
        });

        await request(appOf(handler)).post('/callback').send({}).expect(500);
        expect(logger.error).toHaveBeenCalled();
    });
});

describe('CallbackHandler port collision', () => {
    let blocker: Server | undefined;

    beforeEach(async () => {
        const s = createServer();
        blocker = s;
        await new Promise<void>((resolve) => s.listen(4000, resolve));
    });

    afterEach(async () => {
        const s = blocker;
        if (s) {
            await new Promise<void>((resolve) => s.close(() => resolve()));
        }
    });

    it('retries on EADDRINUSE and logs the retry via logger.warn', async () => {
        const logger = makeLogger();
        const handler = new CallbackHandler({
            ngrokAuthToken: 'token',
            onCallback: () => {},
            logger,
        });

        const url = await handler.start();
        expect(url).toBe('https://mock.ngrok.app/callback');
        expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/Port 4000 in use/));

        await handler.stop();
    });
});

describe('CallbackHandler logger is optional', () => {
    it('operates silently when no logger is provided', async () => {
        const onCallback = vi.fn();
        const handler = new CallbackHandler({
            ngrokAuthToken: 'token',
            onCallback,
        });

        // Reach through and confirm the no-op logger doesn't throw when invoked.
        // We can't observe silence directly; run a callback to prove the path works.
        await request(appOf(handler)).post('/callback').send({ ok: true }).expect(200);
        expect(onCallback).toHaveBeenCalledTimes(1);
    });
});
