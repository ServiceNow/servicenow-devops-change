const { ABORT_REASON } = require('../src/lib/abort-reason');

function flushPromises() {
  // main() is a fire-and-forget async IIFE (`main();` at the bottom of
  // src/main.js), so requiring the module only runs it up to its first
  // await. Draining the microtask queue via a macrotask a few times lets
  // every chained await inside it settle before we assert.
  return new Promise((resolve) => setImmediate(resolve));
}

async function flushAll(times = 4) {
  for (let i = 0; i < times; i += 1) {
    await flushPromises();
  }
}

const DEFAULT_INPUTS = {
  'instance-url': 'https://example.service-now.com',
  'tool-id': 'tool-1',
  'devops-integration-user-name': '',
  'devops-integration-user-password': '',
  'devops-integration-token': 'a-token',
  'job-name': 'CDP-Tenant-Service-Deployment',
  'deployment-gate': '',
  'change-request': '{}',
  'context-github': '{}',
  abortOnChangeCreationFailure: 'true',
  changeCreationTimeOut: '600',
  timeout: '600',
  interval: '100',
  abortOnChangeStepTimeout: 'true'
};

// Each test gets a fresh copy of src/main.js (and its dependencies) so the
// module-level `main();` self-invocation runs exactly once per test, against
// mocks configured for that test only.
function loadMain({ inputs = {}, createChangeImpl, tryFetchImpl } = {}) {
  let core;
  let createChange;
  let tryFetch;

  jest.isolateModules(() => {
    jest.mock('@actions/core');
    jest.mock('../src/lib/create-change');
    jest.mock('../src/lib/try-fetch');

    core = require('@actions/core');
    ({ createChange } = require('../src/lib/create-change'));
    ({ tryFetch } = require('../src/lib/try-fetch'));

    const merged = { ...DEFAULT_INPUTS, ...inputs };
    core.getInput.mockImplementation((name) => merged[name] ?? '');

    if (createChangeImpl) createChange.mockImplementation(createChangeImpl);
    if (tryFetchImpl) tryFetch.mockImplementation(tryFetchImpl);

    require('../src/main');
  });

  return { core, createChange, tryFetch };
}

describe('main - abort-reason output', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('reports SERVICENOW_ERROR when the create call fails with a tagged error', async () => {
    const taggedError = new Error('Invalid Credentials. Please correct the credentials and try again.');
    taggedError.reason = ABORT_REASON.SERVICENOW_ERROR;

    const { core } = loadMain({
      createChangeImpl: () => Promise.reject(taggedError)
    });
    await flushAll();

    expect(core.setOutput).toHaveBeenCalledWith('abort-reason', ABORT_REASON.SERVICENOW_ERROR);
    expect(core.setFailed).toHaveBeenCalledWith(taggedError.message);
  });

  test('defaults to SERVICENOW_ERROR when the create call fails with an untagged error', async () => {
    const { core } = loadMain({
      createChangeImpl: () => Promise.reject(new Error('boom'))
    });
    await flushAll();

    expect(core.setOutput).toHaveBeenCalledWith('abort-reason', ABORT_REASON.SERVICENOW_ERROR);
  });

  test('does not report abort-reason when abortOnChangeCreationFailure is false', async () => {
    const { core } = loadMain({
      inputs: { abortOnChangeCreationFailure: 'false' },
      createChangeImpl: () => Promise.reject(new Error('boom'))
    });
    await flushAll();

    expect(core.setOutput).not.toHaveBeenCalledWith('abort-reason', expect.anything());
  });

  test('reports TIMEOUT when the change is created but polling later times out', async () => {
    const taggedError = new Error('Timeout after 600 seconds.Workflow execution is aborted since abortOnChangeStepTimeout flag is true');
    taggedError.reason = ABORT_REASON.TIMEOUT;

    const { core } = loadMain({
      createChangeImpl: () => Promise.resolve({ data: { result: { status: 'Success' } } }),
      tryFetchImpl: () => Promise.reject(taggedError)
    });
    await flushAll();

    expect(core.setOutput).toHaveBeenCalledWith('abort-reason', ABORT_REASON.TIMEOUT);
    expect(core.setFailed).toHaveBeenCalledWith(taggedError.message);
  });

  test('does not report abort-reason on a clean success', async () => {
    const { core } = loadMain({
      createChangeImpl: () => Promise.resolve({ data: { result: { status: 'Success' } } }),
      tryFetchImpl: () => Promise.resolve(true)
    });
    await flushAll();

    expect(core.setOutput).not.toHaveBeenCalledWith('abort-reason', expect.anything());
    expect(core.setFailed).not.toHaveBeenCalled();
  });
});
