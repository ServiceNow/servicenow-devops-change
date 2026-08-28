jest.mock('axios');
jest.mock('@actions/core');

const axios = require('axios');
const core = require('@actions/core');
const { createChange } = require('../../src/lib/create-change');
const { ABORT_REASON } = require('../../src/lib/abort-reason');

function baseArgs(overrides = {}) {
  return {
    instanceUrl: 'https://example.service-now.com',
    toolId: 'tool-1',
    username: '',
    passwd: '',
    token: 'a-token',
    jobname: 'CDP-Tenant-Service-Deployment',
    githubContextStr: JSON.stringify({ run_id: '1', run_attempt: '1', sha: 'abc', workflow: 'wf', repository: 'org/repo', ref_name: 'main' }),
    changeRequestDetailsStr: '{}',
    deploymentGateStr: '',
    ...overrides
  };
}

describe('createChange - abort-reason tagging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('tags an HTTP-level create timeout (ECONNABORTED) as TIMEOUT', async () => {
    axios.post.mockRejectedValue({ code: 'ECONNABORTED', message: 'timeout of 600000ms exceeded', config: { timeout: 600000 } });

    await expect(createChange(baseArgs())).rejects.toMatchObject({
      reason: ABORT_REASON.TIMEOUT,
      message: expect.stringContaining('change creation timeout after')
    });
  });

  test('tags an invalid instance URL (ENOTFOUND) as SERVICENOW_ERROR', async () => {
    axios.post.mockRejectedValue({ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND example.service-now.com' });

    await expect(createChange(baseArgs())).rejects.toMatchObject({
      reason: ABORT_REASON.SERVICENOW_ERROR,
      message: expect.stringContaining('Invalid ServiceNow Instance URL')
    });
  });

  test('tags a 500 response as SERVICENOW_ERROR', async () => {
    axios.post.mockRejectedValue({ message: 'Request failed with status code 500', response: { status: 500 } });

    await expect(createChange(baseArgs())).rejects.toMatchObject({
      reason: ABORT_REASON.SERVICENOW_ERROR,
      message: expect.stringContaining('Response Code from ServiceNow is 500')
    });
  });

  test('tags a 400 response carrying a ServiceNow error message as SERVICENOW_ERROR', async () => {
    axios.post.mockRejectedValue({
      message: 'Request failed with status code 400',
      response: { status: 400, data: { result: { errorMessage: 'Pipeline is not configured to track' } } }
    });

    await expect(createChange(baseArgs())).rejects.toMatchObject({
      reason: ABORT_REASON.SERVICENOW_ERROR,
      message: 'Pipeline is not configured to track'
    });
  });

  test('tags malformed change-request input as SERVICENOW_ERROR', async () => {
    await expect(createChange(baseArgs({ changeRequestDetailsStr: 'not-json' }))).rejects.toMatchObject({
      reason: ABORT_REASON.SERVICENOW_ERROR,
      message: 'Failed parsing changeRequestDetails'
    });
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('does not tag or throw on a successful create call', async () => {
    axios.post.mockResolvedValue({ data: { result: { status: 'Success' } } });

    await expect(createChange(baseArgs())).resolves.toEqual({ data: { result: { status: 'Success' } } });
  });
});
