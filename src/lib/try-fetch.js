const core = require('@actions/core');
const { doFetch } = require('./do-fetch');

async function tryFetch({
  start = +new Date(),
  interval,
  timeout,
  instanceUrl,
  toolId,
  username,
  passwd,
  jobname,
  githubContextStr,
  abortOnChangeStepTimeout
}) {
    try {
        await doFetch({
          instanceUrl,
          toolId,
          username,
          passwd,
          jobname,
          githubContextStr
        });
    } catch (error) {
        if (error.message == "500") {
          throw new Error(`Internal server error. An unexpected error occurred while processing the request.`);
        }

        if (error.message == "400") {
          throw new Error(`Bad Request. Missing inputs to process the request.`);
        }

        if (error.message == "401") {
          throw new Error(`The user credentials are incorrect.`);
        }

        if (error.message == "403") {
          throw new Error(`Forbidden. The user does not have the role to process the request.`);
        }

        if (error.message == "404") {
          throw new Error(`Not found. The requested item was not found.`);
        }

        if (error.message == "202") {
          throw new Error("****Change has been created but the change is either rejected or cancelled.");
        }

        if (error.message == "201") {
          console.log('\n****Change is pending for approval decision.');
        }

        // Wait and then continue
        await new Promise((resolve) => setTimeout(resolve, interval * 1000));

        if (+new Date() - start > timeout * 1000) {
          if(!abortOnChangeStepTimeout){
             console.error('\n    \x1b[38;5;214m Timeout occured after '+timeout+' seconds but pipeline will coninue since abortOnChangeStepTimeout flag is false \x1b[38;5;214m');
             return;
          }
             throw new Error(`Timeout after ${timeout} seconds.Workflow execution is aborted since abortOnChangeStepTimeout flag is true`);
        }


        await tryFetch({
          start,
          interval,
          timeout,
          instanceUrl,
          toolId,
          username,
          passwd,
          jobname,
          githubContextStr,
          abortOnChangeStepTimeout
        });
    }
}

module.exports = { tryFetch };
