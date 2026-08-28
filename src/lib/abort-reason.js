/**
 * The two buckets the `abort-reason` output can report.
 *
 * TIMEOUT   - the action gave up waiting: changeCreationTimeOut expired
 *             while the change had not yet been observed, the step polling
 *             `timeout` expired (abortOnChangeStepTimeout), or the initial
 *             create request itself timed out at the HTTP layer.
 * SERVICENOW_ERROR - anything else that ends the action: a ServiceNow API
 *             error response (4xx/5xx), invalid credentials/instance URL, a
 *             rejected/cancelled change, a change that reached a
 *             failed/error state, or malformed input. This is the catch-all
 *             "not a timeout" bucket, not a guarantee the fault is on
 *             ServiceNow's side.
 */
const ABORT_REASON = Object.freeze({
  TIMEOUT: 'timeout',
  SERVICENOW_ERROR: 'servicenow-error'
});

/**
 * Creates an Error tagged with `.reason`, one of the ABORT_REASON values, so
 * it survives being thrown/caught across the create -> poll call chain.
 * Defaults to SERVICENOW_ERROR since that's the outcome for the large
 * majority of throw sites - callers on a timeout path pass
 * ABORT_REASON.TIMEOUT explicitly.
 */
function createTaggedError(message, reason = ABORT_REASON.SERVICENOW_ERROR) {
  const error = new Error(message);
  error.reason = reason;
  return error;
}

module.exports = { ABORT_REASON, createTaggedError };
