const core = require('@actions/core');
const axios = require('axios');
const { createChange } = require('./lib/create-change');
const { tryFetch } = require('./lib/try-fetch');

const main = async() => {
  try {
    const instanceName = core.getInput('instance-name', { required: true });
    const toolId = core.getInput('tool-id', { required: true });
    const username = core.getInput('devops-integration-user-name', { required: true });
    const passwd = core.getInput('devops-integration-user-password', { required: true });
    const jobname = core.getInput('job-name', { required: true });

    let changeRequestDetailsStr = core.getInput('change-request', { required: true });
    let githubContextStr = core.getInput('context-github', { required: true });
    let status = true;

    try {
      await createChange({
        instanceName,
        toolId,
        username,
        passwd,
        jobname,
        githubContextStr,
        changeRequestDetailsStr
      });
    } catch (err) {
      status = false;
      core.setFailed(`Unknown Exception from Change Control API to create change for the given inputs.`);  
    }

    if (status) {
      let timeout = parseInt(core.getInput('timeout') || 100);
      let interval = parseInt(core.getInput('interval') || 3600);

      interval = interval>=100 ? interval : 100;
      timeout = timeout>=100? timeout : 3600;

      let start = +new Date();
      
      await tryFetch({
        start,
        interval,
        timeout,
        instanceName,
        toolId,
        username,
        passwd,
        jobname,
        githubContextStr
      });

      core.debug('Get change status was successfull.');
      
    } else {
      core.setFailed('Change could not be created for the given inputs.');
    }
   
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();