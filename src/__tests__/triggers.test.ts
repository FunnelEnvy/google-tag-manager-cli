import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import nock from 'nock';

const API_BASE = 'https://tagmanager.googleapis.com';
const WORKSPACE_PATH = '/tagmanager/v2/accounts/111/containers/222/workspaces/333';

describe('triggers commands', () => {
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

  describe('triggers list', () => {
    it('fetches triggers in a workspace', async () => {
      const mockResponse = {
        trigger: [
          {
            path: `${WORKSPACE_PATH}/triggers/1`,
            accountId: '111',
            containerId: '222',
            workspaceId: '333',
            triggerId: '1',
            name: 'All Pages',
            type: 'pageview',
            fingerprint: 'fp1',
            tagManagerUrl: 'https://tagmanager.google.com',
          },
          {
            path: `${WORKSPACE_PATH}/triggers/2`,
            accountId: '111',
            containerId: '222',
            workspaceId: '333',
            triggerId: '2',
            name: 'Click - Button',
            type: 'click',
            fingerprint: 'fp2',
            tagManagerUrl: 'https://tagmanager.google.com',
          },
        ],
      };

      const scope = nock(API_BASE)
        .get(`${WORKSPACE_PATH}/triggers`)
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, mockResponse);

      const { request } = await import('../lib/http.js');
      const data = await request<typeof mockResponse>(
        `${API_BASE}${WORKSPACE_PATH}/triggers`,
        { headers: { Authorization: 'Bearer test-token-123' } },
      );

      expect(data.trigger).toHaveLength(2);
      expect(data.trigger[0].name).toBe('All Pages');
      expect(data.trigger[0].type).toBe('pageview');
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('triggers create', () => {
    it('creates a new trigger', async () => {
      const scope = nock(API_BASE)
        .post(`${WORKSPACE_PATH}/triggers`, {
          name: 'Form Submit',
          type: 'formSubmission',
        })
        .matchHeader('authorization', 'Bearer test-token-123')
        .reply(200, {
          triggerId: '5',
          name: 'Form Submit',
          type: 'formSubmission',
          accountId: '111',
          containerId: '222',
          workspaceId: '333',
        });

      const { request } = await import('../lib/http.js');
      const data = await request<{ triggerId: string }>(
        `${API_BASE}${WORKSPACE_PATH}/triggers`,
        {
          method: 'POST',
          headers: { Authorization: 'Bearer test-token-123' },
          body: { name: 'Form Submit', type: 'formSubmission' },
        },
      );

      expect(data.triggerId).toBe('5');
      expect(scope.isDone()).toBe(true);
    });
  });
});
