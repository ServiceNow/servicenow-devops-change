const core = require('@actions/core');
const { doFetch } = require('./do-fetch');
const { ABORT_REASON, createTaggedError } = require('./abort-reason');

async function tryFetch({
  start = +new Date(),
  interval,
  timeout,
  instanceUrl,
  toolId,
  username,
  passwd,
  token,
  jobname,
  githubContextStr,
  abortOnChangeStepTimeout,
  prevPollChangeDetails,
  changeCreationTimeOut,
  abortOnChangeCreationFailure,
  changeCreationStartTime
}) {
    try {
        await doFetch({
          changeCreationStartTime,
          instanceUrl,
          toolId,
          username,
          passwd,
          token,
          jobname,
          githubContextStr,
          prevPollChangeDetails,
          changeCreationTimeOut,
          abortOnChangeCreationFailure
        });
    } catch (error) {
        if (error.message == "500") {
          throw createTaggedError(`Internal server error. An unexpected error occurred while processing the request.`, ABORT_REASON.SERVICENOW_ERROR);
        }

        if (error.message == "400") {
          throw createTaggedError(`Bad Request. Missing inputs to process the request.`, ABORT_REASON.SERVICENOW_ERROR);
        }

        if (error.message == "401") {
          throw createTaggedError(`The user credentials are incorrect.`, ABORT_REASON.SERVICENOW_ERROR);
        }

        if (error.message == "403") {
          throw createTaggedError(`Forbidden. The user does not have the role to process the request.`, ABORT_REASON.SERVICENOW_ERROR);
        }

        if (error.message == "404") {
          throw createTaggedError(`Not found. The requested item was not found.`, ABORT_REASON.SERVICENOW_ERROR);
        }

        if (error.message == "202") {
          throw createTaggedError("****Change has been created but the change is either rejected or cancelled.", ABORT_REASON.SERVICENOW_ERROR);
        }

        if (error.message == "ChangeCreationFailure_DontFailTheStep") {
          return;
        }

        const errorMessage = error.message;
        if (errorMessage) {
          const errorObject = JSON.parse(errorMessage);
          if (errorObject && errorObject.statusCode == "201") {
             prevPollChangeDetails = errorObject.details;
          }else if(errorObject && errorObject.status == "error"){
            //throws error incase of status is 'error'. reason is carried over
            //from do-fetch.js so a changeCreationTimeOut abort is still
            //reported as ABORT_REASON.TIMEOUT once it reaches main.js.
             throw createTaggedError(errorObject.details, errorObject.reason || ABORT_REASON.SERVICENOW_ERROR);
          }
        }

        // Wait and then continue
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));

        if (+new Date() - start > timeout * 1000) {
          if(!abortOnChangeStepTimeout){
             console.error('\n    \x1b[38;5;214m Timeout occured after '+timeout+' seconds but pipeline will coninue since abortOnChangeStepTimeout flag is false \x1b[38;5;214m');
             return;
          }
             throw createTaggedError(`Timeout after ${timeout} seconds.Workflow execution is aborted since abortOnChangeStepTimeout flag is true`, ABORT_REASON.TIMEOUT);
        }


        await tryFetch({
          start,
          interval,
          timeout,
          instanceUrl,
          toolId,
          username,
          passwd,
          token,
          jobname,
          githubContextStr,
          abortOnChangeStepTimeout,
          prevPollChangeDetails,
          changeCreationTimeOut,
          abortOnChangeCreationFailure,
          changeCreationStartTime
        });
    }
}

module.exports = { tryFetch };
