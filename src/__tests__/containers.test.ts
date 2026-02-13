import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import nock from 'nock';

const API_BASE = 'https://tagmanager.googleapis.com';

describe('containers commands', () => {
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

  describe('containers list', () => {
    it('fetches containers for an account', async () => {
      const mockResponse = {
        container: [
          {
            path: 'accounts/111/containers/222',
            accountId: '111',
            containerId: '222',
            name: 'My Website',
            publicId: 'GTM-ABCD',
            usageContext: ['WEB'],
            domainName: ['example.com'],
            fingerprint: 'fp1',
            tagManagerUrl: 'https://tagmanager.google.com/#/container/accounts/111/containers/222',
          },
        ],
      };

      const scope = nock(API_BASE)
        .get('/tagmanager/v2/accounts/111/containers')
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, mockResponse);

      const { request } = await import('../lib/http.js');
      const data = await request<typeof mockResponse>(
        `${API_BASE}/tagmanager/v2/accounts/111/containers`,
        { headers: { Authorization: 'Bearer test-token-123' } },
      );

      expect(data.container).toHaveLength(1);
      expect(data.container[0].name).toBe('My Website');
      expect(data.container[0].publicId).toBe('GTM-ABCD');
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('containers create', () => {
    it('creates a new container', async () => {
      const scope = nock(API_BASE)
        .post('/tagmanager/v2/accounts/111/containers', {
          name: 'New Site',
          usageContext: ['WEB'],
        })
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, {
          accountId: '111',
          containerId: '333',
          name: 'New Site',
          publicId: 'GTM-WXYZ',
          usageContext: ['WEB'],
        });

      const { request } = await import('../lib/http.js');
      const data = await request<{ containerId: string; name: string }>(
        `${API_BASE}/tagmanager/v2/accounts/111/containers`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer test-token-123' },
          body: { name: 'New Site', usageContext: ['WEB'] },
        },
      );

      expect(data.containerId).toBe('333');
      expect(data.name).toBe('New Site');
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('containers delete', () => {
    it('deletes a container', async () => {
      const scope = nock(API_BASE)
        .delete('/tagmanager/v2/accounts/111/containers/222')
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, '');

      const { request } = await import('../lib/http.js');
      await request(
        `${API_BASE}/tagmanager/v2/accounts/111/containers/222`,
        { method: 'DELETE', headers: { Authorization: 'Bearer test-token-123' } },
      );

      expect(scope.isDone()).toBe(true);
    });
  });
});
