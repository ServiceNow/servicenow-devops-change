jest.mock('../../src/lib/do-fetch');
jest.mock('@actions/core');

const { doFetch } = require('../../src/lib/do-fetch');
const { tryFetch } = require('../../src/lib/try-fetch');
const { ABORT_REASON } = require('../../src/lib/abort-reason');

function baseArgs(overrides = {}) {
  return {
    start: Date.now(),
    interval: 0, // no real delay in tests
    timeout: 600,
    instanceUrl: 'https://example.service-now.com',
    toolId: 'tool-1',
    username: '',
    passwd: '',
    token: 'a-token',
    jobname: 'CDP-Tenant-Service-Deployment',
    githubContextStr: '{}',
    abortOnChangeStepTimeout: true,
    prevPollChangeDetails: {},
    changeCreationTimeOut: 600,
    abortOnChangeCreationFailure: true,
    changeCreationStartTime: Date.now(),
    ...overrides
  };
}

describe('tryFetch - abort-reason tagging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('tags a bare "500" from doFetch as SERVICENOW_ERROR', async () => {
    doFetch.mockRejectedValue(new Error('500'));

    await expect(tryFetch(baseArgs())).rejects.toMatchObject({
      reason: ABORT_REASON.SERVICENOW_ERROR,
      message: expect.stringContaining('Internal server error')
    });
  });

  test('tags a rejected/cancelled change ("202") as SERVICENOW_ERROR', async () => {
    doFetch.mockRejectedValue(new Error('202'));

    await expect(tryFetch(baseArgs())).rejects.toMatchObject({
      reason: ABORT_REASON.SERVICENOW_ERROR,
      message: expect.stringContaining('rejected or cancelled')
    });
  });

  test('carries a TIMEOUT reason through from a JSON-wrapped changeCreationTimeOut abort', async () => {
    doFetch.mockRejectedValue(new Error(JSON.stringify({
      status: 'error',
      reason: ABORT_REASON.TIMEOUT,
      details: 'Timeout after 600 seconds.Workflow execution is aborted since abortOnChangeCreationFailure flag is true'
    })));

    await expect(tryFetch(baseArgs())).rejects.toMatchObject({
      reason: ABORT_REASON.TIMEOUT,
      message: expect.stringContaining('Timeout after 600 seconds')
    });
  });

  test('carries a SERVICENOW_ERROR reason through from a JSON-wrapped failed change state', async () => {
    doFetch.mockRejectedValue(new Error(JSON.stringify({
      status: 'error',
      reason: ABORT_REASON.SERVICENOW_ERROR,
      details: 'Something went wrong in ServiceNow'
    })));

    await expect(tryFetch(baseArgs())).rejects.toMatchObject({
      reason: ABORT_REASON.SERVICENOW_ERROR,
      message: 'Something went wrong in ServiceNow'
    });
  });

  test('defaults to SERVICENOW_ERROR when a JSON-wrapped error carries no reason', async () => {
    doFetch.mockRejectedValue(new Error(JSON.stringify({ status: 'error', details: 'legacy error shape' })));

    await expect(tryFetch(baseArgs())).rejects.toMatchObject({
      reason: ABORT_REASON.SERVICENOW_ERROR,
      message: 'legacy error shape'
    });
  });

  test('tags the overall polling timeout as TIMEOUT when abortOnChangeStepTimeout is true', async () => {
    // "201" is valid JSON (parses to the number 201) but matches none of the
    // special-cased branches, so tryFetch falls through to its wait-and-retry
    // logic and hits the elapsed-time check below.
    doFetch.mockRejectedValue(new Error('201'));

    await expect(tryFetch(baseArgs({
      start: Date.now() - 700_000, // already past the 600s timeout
      timeout: 600,
      abortOnChangeStepTimeout: true
    }))).rejects.toMatchObject({
      reason: ABORT_REASON.TIMEOUT,
      message: expect.stringContaining('Timeout after 600 seconds')
    });
  });

  test('does not throw on the overall polling timeout when abortOnChangeStepTimeout is false', async () => {
    doFetch.mockRejectedValue(new Error('201'));

    await expect(tryFetch(baseArgs({
      start: Date.now() - 700_000,
      timeout: 600,
      abortOnChangeStepTimeout: false
    }))).resolves.toBeUndefined();
  });
});
