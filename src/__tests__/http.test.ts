import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { request, HttpError } from '../lib/http.js';

const API_BASE = 'https://tagmanager.googleapis.com';

describe('HTTP client', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('makes a GET request with auth header', async () => {
    const scope = nock(API_BASE)
      .get('/tagmanager/v2/accounts')
      .matchHeader('authorization', 'Bearer test-token')
      .reply(200, { account: [{ accountId: '123', name: 'Test' }] });

    const data = await request<{ account: unknown[] }>(
      `${API_BASE}/tagmanager/v2/accounts`,
      { headers: { Authorization: 'Bearer test-token' } },
    );

    expect(data.account).toHaveLength(1);
    expect(scope.isDone()).toBe(true);
  });

  it('makes a POST request with body', async () => {
    const scope = nock(API_BASE)
      .post('/tagmanager/v2/accounts/123/containers', { name: 'New Container', usageContext: ['WEB'] })
      .matchHeader('authorization', 'Bearer test-token')
      .reply(200, { containerId: '456', name: 'New Container' });

    const data = await request<{ containerId: string }>(
      `${API_BASE}/tagmanager/v2/accounts/123/containers`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
        body: { name: 'New Container', usageContext: ['WEB'] },
      },
    );

    expect(data.containerId).toBe('456');
    expect(scope.isDone()).toBe(true);
  });

  it('throws HttpError on 401', async () => {
    nock(API_BASE)
      .get('/tagmanager/v2/accounts')
      .reply(401, { error: { message: 'Unauthorized' } });

    await expect(
      request(`${API_BASE}/tagmanager/v2/accounts`, {
        headers: { Authorization: 'Bearer bad-token' },
      }),
    ).rejects.toThrow(HttpError);
  });

  it('throws HttpError on 404', async () => {
    nock(API_BASE)
      .get('/tagmanager/v2/accounts/999')
      .reply(404, { error: { message: 'Not found' } });

    await expect(
      request(`${API_BASE}/tagmanager/v2/accounts/999`, {
        headers: { Authorization: 'Bearer test-token' },
      }),
    ).rejects.toThrow(HttpError);
  });

  it('throws RATE_LIMITED on 429', async () => {
    nock(API_BASE)
      .get('/tagmanager/v2/accounts')
      .reply(429, '', { 'retry-after': '30' });

    try {
      await request(`${API_BASE}/tagmanager/v2/accounts`, {
        headers: { Authorization: 'Bearer test-token' },
      });
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe('RATE_LIMITED');
      expect((error as HttpError).retryAfter).toBe(30);
    }
  });

  it('handles empty response body', async () => {
    nock(API_BASE)
      .delete('/tagmanager/v2/accounts/123/containers/456')
      .reply(200, '');

    const data = await request(
      `${API_BASE}/tagmanager/v2/accounts/123/containers/456`,
      { method: 'DELETE', headers: { Authorization: 'Bearer test-token' } },
    );

    expect(data).toEqual({});
  });
});
