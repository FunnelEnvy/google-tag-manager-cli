import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import nock from 'nock';

const API_BASE = 'https://tagmanager.googleapis.com';
const WORKSPACE_PATH = '/tagmanager/v2/accounts/111/containers/222/workspaces/333';

describe('tags commands', () => {
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

  describe('tags list', () => {
    it('fetches tags in a workspace', async () => {
      const mockResponse = {
        tag: [
          {
            path: `${WORKSPACE_PATH}/tags/10`,
            accountId: '111',
            containerId: '222',
            workspaceId: '333',
            tagId: '10',
            name: 'GA4 Config',
            type: 'gaawc',
            firingTriggerId: ['1'],
            fingerprint: 'fp1',
            tagManagerUrl: 'https://tagmanager.google.com',
          },
          {
            path: `${WORKSPACE_PATH}/tags/11`,
            accountId: '111',
            containerId: '222',
            workspaceId: '333',
            tagId: '11',
            name: 'Custom HTML',
            type: 'html',
            firingTriggerId: ['2', '3'],
            blockingTriggerId: ['4'],
            fingerprint: 'fp2',
            tagManagerUrl: 'https://tagmanager.google.com',
          },
        ],
      };

      const scope = nock(API_BASE)
        .get(`${WORKSPACE_PATH}/tags`)
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, mockResponse);

      const { request } = await import('../lib/http.js');
      const data = await request<typeof mockResponse>(
        `${API_BASE}${WORKSPACE_PATH}/tags`,
        { headers: { Authorization: 'Bearer test-token-123' } },
      );

      expect(data.tag).toHaveLength(2);
      expect(data.tag[0].name).toBe('GA4 Config');
      expect(data.tag[1].firingTriggerId).toEqual(['2', '3']);
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('tags create', () => {
    it('creates a new tag', async () => {
      const newTag = {
        name: 'New Tag',
        type: 'html',
        firingTriggerId: ['1'],
      };

      const scope = nock(API_BASE)
        .post(`${WORKSPACE_PATH}/tags`, newTag)
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, {
          ...newTag,
          tagId: '20',
          accountId: '111',
          containerId: '222',
          workspaceId: '333',
          fingerprint: 'fp-new',
          tagManagerUrl: 'https://tagmanager.google.com',
        });

      const { request } = await import('../lib/http.js');
      const data = await request<{ tagId: string; name: string }>(
        `${API_BASE}${WORKSPACE_PATH}/tags`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer test-token-123' },
          body: newTag,
        },
      );

      expect(data.tagId).toBe('20');
      expect(data.name).toBe('New Tag');
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('tags delete', () => {
    it('deletes a tag', async () => {
      const scope = nock(API_BASE)
        .delete(`${WORKSPACE_PATH}/tags/10`)
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, '');

      const { request } = await import('../lib/http.js');
      await request(
        `${API_BASE}${WORKSPACE_PATH}/tags/10`,
        { method: 'DELETE', headers: { Authorization: 'Bearer test-token-123' } },
      );

      expect(scope.isDone()).toBe(true);
    });
  });
});
