const core = require('@actions/core');
const axios = require('axios');
const { createChange } = require('./lib/create-change');
const { tryFetch } = require('./lib/try-fetch');

const main = async() => {
  try {
    const instanceUrl = core.getInput('instance-url', { required: true });
    const toolId = core.getInput('tool-id', { required: true });
    const username = core.getInput('devops-integration-user-name', { required: false });
    const passwd = core.getInput('devops-integration-user-password', { required: false });
    const token = core.getInput('devops-integration-token', { required: false });
    const jobname = core.getInput('job-name', { required: true });
    const deploymentGateStr = core.getInput('deployment-gate', { required: false });

    let changeRequestDetailsStr = core.getInput('change-request', { required: true });
    let githubContextStr = core.getInput('context-github', { required: true });

    let abortOnChangeCreationFailure = core.getInput('abortOnChangeCreationFailure');
    abortOnChangeCreationFailure = abortOnChangeCreationFailure === undefined || abortOnChangeCreationFailure === "" ? true : (abortOnChangeCreationFailure == "true");
    let changeCreationTimeOut = parseInt(core.getInput('changeCreationTimeOut') || 3600);
    changeCreationTimeOut = changeCreationTimeOut >= 3600 ? changeCreationTimeOut : 3600;

    let status = true;
    let response;

    try {
      response = await createChange({
        instanceUrl,
        toolId,
        username,
        passwd,
        token,
        jobname,
        githubContextStr,
        changeRequestDetailsStr,
        changeCreationTimeOut,
        deploymentGateStr
      });
    } catch (err) {
      if (abortOnChangeCreationFailure) {
        status = false;
        core.setFailed(err.message);
      }
      else { 
        console.error("creation failed with error message ," + err.message);
        console.log('\n  \x1b[38;5;214m Workflow will continue executing the next step as abortOnChangeCreationFailure is ' + abortOnChangeCreationFailure + '\x1b[38;5;214m');
        return;
      }
    }

    if (deploymentGateStr)
      status = false; //do not poll to check for deployment gate feature

    if (status) {
      let timeout = parseInt(core.getInput('timeout') || 100);
      let interval = parseInt(core.getInput('interval') || 3600);

      interval = interval>=100 ? interval : 100;
      timeout = timeout>=100? timeout : 3600;

      let abortOnChangeStepTimeout = core.getInput('abortOnChangeStepTimeout');
      abortOnChangeStepTimeout = abortOnChangeStepTimeout === undefined || abortOnChangeStepTimeout === "" ? false : (abortOnChangeStepTimeout == "true");

      let start = +new Date();
      let prevPollChangeDetails = {};

      response = await tryFetch({
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
        prevPollChangeDetails
      });

    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();