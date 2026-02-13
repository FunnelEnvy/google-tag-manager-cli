import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import nock from 'nock';

const API_BASE = 'https://tagmanager.googleapis.com';

describe('accounts commands', () => {
  beforeAll(() => {
    nock.disableNetConnect();
    vi.stubEnv('GTM_ACCESS_TOKEN', 'test-token-123');
  });

  afterAll(() => {
    nock.enableNetConnect();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('accounts list', () => {
    it('fetches and returns accounts', async () => {
      const mockResponse = {
        account: [
          {
            path: 'accounts/111',
            accountId: '111',
            name: 'Test Account',
            shareData: false,
            fingerprint: 'abc123',
            tagManagerUrl: 'https://tagmanager.google.com/#/admin/accounts/111',
          },
          {
            path: 'accounts/222',
            accountId: '222',
            name: 'Another Account',
            shareData: true,
            fingerprint: 'def456',
            tagManagerUrl: 'https://tagmanager.google.com/#/admin/accounts/222',
          },
        ],
      };

      const scope = nock(API_BASE)
        .get('/tagmanager/v2/accounts')
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, mockResponse);

      const { request } = await import('../lib/http.js');
      const data = await request<typeof mockResponse>(
        `${API_BASE}/tagmanager/v2/accounts`,
        { headers: { Authorization: 'Bearer test-token-123' } },
      );

      expect(data.account).toHaveLength(2);
      expect(data.account[0].name).toBe('Test Account');
      expect(data.account[1].accountId).toBe('222');
      expect(scope.isDone()).toBe(true);
    });

    it('handles empty account list', async () => {
      nock(API_BASE)
        .get('/tagmanager/v2/accounts')
        .reply(200, { account: [] });

      const { request } = await import('../lib/http.js');
      const data = await request<{ account: unknown[] }>(
        `${API_BASE}/tagmanager/v2/accounts`,
        { headers: { Authorization: 'Bearer test-token-123' } },
      );

      expect(data.account).toHaveLength(0);
    });

    it('handles pagination token', async () => {
      const mockResponse = {
        account: [{ accountId: '333', name: 'Page 1' }],
        nextPageToken: 'next-page-abc',
      };

      nock(API_BASE)
        .get('/tagmanager/v2/accounts')
        .query({ pageToken: 'start' })
        .reply(200, mockResponse);

      const { request } = await import('../lib/http.js');
      const data = await request<typeof mockResponse>(
        `${API_BASE}/tagmanager/v2/accounts?pageToken=start`,
        { headers: { Authorization: 'Bearer test-token-123' } },
      );

      expect(data.nextPageToken).toBe('next-page-abc');
    });
  });

  describe('accounts get', () => {
    it('fetches a single account', async () => {
      const mockAccount = {
        path: 'accounts/111',
        accountId: '111',
        name: 'Test Account',
        shareData: false,
        fingerprint: 'abc123',
        tagManagerUrl: 'https://tagmanager.google.com/#/admin/accounts/111',
      };

      const scope = nock(API_BASE)
        .get('/tagmanager/v2/accounts/111')
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, mockAccount);

      const { request } = await import('../lib/http.js');
      const data = await request<typeof mockAccount>(
        `${API_BASE}/tagmanager/v2/accounts/111`,
        { headers: { Authorization: 'Bearer test-token-123' } },
      );

      expect(data.name).toBe('Test Account');
      expect(data.accountId).toBe('111');
      expect(scope.isDone()).toBe(true);
    });
  });
});
