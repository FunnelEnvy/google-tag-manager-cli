import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import nock from 'nock';

const API_BASE = 'https://tagmanager.googleapis.com';

describe('versions commands', () => {
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

  describe('versions list', () => {
    it('fetches version headers', async () => {
      const mockResponse = {
        containerVersionHeader: [
          {
            path: 'accounts/111/containers/222/version_headers/1',
            accountId: '111',
            containerId: '222',
            containerVersionId: '1',
            name: 'v1.0',
            numTags: '5',
            numTriggers: '3',
            numVariables: '2',
          },
          {
            path: 'accounts/111/containers/222/version_headers/2',
            accountId: '111',
            containerId: '222',
            containerVersionId: '2',
            name: 'v2.0',
            numTags: '8',
            numTriggers: '4',
            numVariables: '3',
          },
        ],
      };

      const scope = nock(API_BASE)
        .get('/tagmanager/v2/accounts/111/containers/222/version_headers')
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, mockResponse);

      const { request } = await import('../lib/http.js');
      const data = await request<typeof mockResponse>(
        `${API_BASE}/tagmanager/v2/accounts/111/containers/222/version_headers`,
        { headers: { Authorization: 'Bearer test-token-123' } },
      );

      expect(data.containerVersionHeader).toHaveLength(2);
      expect(data.containerVersionHeader[0].name).toBe('v1.0');
      expect(data.containerVersionHeader[1].numTags).toBe('8');
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('versions publish', () => {
    it('publishes a version', async () => {
      const scope = nock(API_BASE)
        .post('/tagmanager/v2/accounts/111/containers/222/versions/1:publish')
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, {
          containerVersion: {
            containerVersionId: '1',
            name: 'v1.0',
            fingerprint: 'fp1',
            tagManagerUrl: 'https://tagmanager.google.com',
          },
        });

      const { request } = await import('../lib/http.js');
      const data = await request<{ containerVersion: { containerVersionId: string } }>(
        `${API_BASE}/tagmanager/v2/accounts/111/containers/222/versions/1:publish`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer test-token-123' },
        },
      );

      expect(data.containerVersion.containerVersionId).toBe('1');
      expect(scope.isDone()).toBe(true);
    });
  });
});
