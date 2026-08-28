jest.mock('axios');
jest.mock('@actions/core');

const axios = require('axios');
const { doFetch } = require('../../src/lib/do-fetch');
const { ABORT_REASON } = require('../../src/lib/abort-reason');

function baseArgs(overrides = {}) {
  return {
    changeCreationStartTime: Date.now(),
    instanceUrl: 'https://example.service-now.com',
    toolId: 'tool-1',
    username: '',
    passwd: '',
    token: 'a-token',
    jobname: 'CDP-Tenant-Service-Deployment',
    githubContextStr: JSON.stringify({ run_id: '1', run_attempt: '1', workflow: 'wf', repository: 'org/repo' }),
    prevPollChangeDetails: {},
    changeCreationTimeOut: 600,
    abortOnChangeCreationFailure: true,
    ...overrides
  };
}

function parseThrownJson(promise) {
  return promise.catch((error) => JSON.parse(error.message)).then((parsed) => parsed);
}

describe('doFetch - abort-reason tagging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('tags a changeCreationTimeOut abort as TIMEOUT', async () => {
    axios.get.mockResolvedValue({ status: 201, data: { result: { details: {} } } });

    const parsed = await parseThrownJson(doFetch(baseArgs({
      changeCreationTimeOut: 100,
      changeCreationStartTime: Date.now() - 200_000, // 200s ago, well past the 100s timeout
      abortOnChangeCreationFailure: true
    })));

    expect(parsed).toMatchObject({
      status: 'error',
      reason: ABORT_REASON.TIMEOUT
    });
    expect(parsed.details).toMatch(/Timeout after 100 seconds/);
  });

  test('does not abort the changeCreationTimeOut path when abortOnChangeCreationFailure is false', async () => {
    axios.get.mockResolvedValue({ status: 201, data: { result: { details: {} } } });

    await expect(doFetch(baseArgs({
      changeCreationTimeOut: 100,
      changeCreationStartTime: Date.now() - 200_000,
      abortOnChangeCreationFailure: false
    }))).rejects.toThrow('ChangeCreationFailure_DontFailTheStep');
  });

  test('tags a ServiceNow-reported failed change state as SERVICENOW_ERROR', async () => {
    axios.get.mockResolvedValue({
      status: 201,
      data: { result: { details: { status: 'failed', details: 'Something went wrong in ServiceNow' } } }
    });

    const parsed = await parseThrownJson(doFetch(baseArgs()));

    expect(parsed).toMatchObject({
      status: 'error',
      reason: ABORT_REASON.SERVICENOW_ERROR,
      details: 'Something went wrong in ServiceNow'
    });
  });

  test('tags a 400 poll response carrying a ServiceNow error message as SERVICENOW_ERROR', async () => {
    axios.get.mockRejectedValue({
      response: { status: 400, data: { result: { errorMessage: 'Pipeline is not configured to track' } } }
    });

    const parsed = await parseThrownJson(doFetch(baseArgs()));

    expect(parsed).toMatchObject({
      status: 'error',
      reason: ABORT_REASON.SERVICENOW_ERROR,
      details: 'Pipeline is not configured to track'
    });
  });

  test('an implemented change (200) resolves without throwing', async () => {
    axios.get.mockResolvedValue({
      status: 200,
      data: { result: { details: { status: 'implement', number: 'CHG001', sys_id: 'sys-1' } } }
    });

    await expect(doFetch(baseArgs())).resolves.toBe(true);
  });
});
