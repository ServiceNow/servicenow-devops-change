const { ABORT_REASON, createTaggedError } = require('../../src/lib/abort-reason');

describe('ABORT_REASON', () => {
  test('exposes exactly the two documented buckets', () => {
    expect(ABORT_REASON).toEqual({
      TIMEOUT: 'timeout',
      SERVICENOW_ERROR: 'servicenow-error'
    });
  });

  test('is frozen so call sites cannot accidentally mutate it', () => {
    expect(() => {
      ABORT_REASON.TIMEOUT = 'something-else';
    }).not.toThrow(); // non-strict assignment to a frozen object is a silent no-op
    expect(ABORT_REASON.TIMEOUT).toBe('timeout');
  });
});

describe('createTaggedError', () => {
  test('creates a real Error carrying the given message', () => {
    const error = createTaggedError('boom', ABORT_REASON.TIMEOUT);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('boom');
  });

  test('tags the error with the given reason', () => {
    const error = createTaggedError('boom', ABORT_REASON.TIMEOUT);
    expect(error.reason).toBe('timeout');
  });

  test('defaults to SERVICENOW_ERROR when no reason is given', () => {
    const error = createTaggedError('boom');
    expect(error.reason).toBe(ABORT_REASON.SERVICENOW_ERROR);
  });
});
