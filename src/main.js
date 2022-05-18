const core = require('@actions/core');
const axios = require('axios');
const { createChange } = require('./lib/create-change');
const { tryFetch } = require('./lib/try-fetch');

const main = async() => {
  try {
    const instanceUrl = core.getInput('instance-url', { required: true });
    const toolId = core.getInput('tool-id', { required: true });
    const username = core.getInput('devops-integration-user-name', { required: true });
    const passwd = core.getInput('devops-integration-user-password', { required: true });
    const jobname = core.getInput('job-name', { required: true });

    let changeRequestDetailsStr = core.getInput('change-request', { required: true });
    let githubContextStr = core.getInput('context-github', { required: true });
    let status = true;
    let response;

    try {
      response = await createChange({
        instanceUrl,
        toolId,
        username,
        passwd,
        jobname,
        githubContextStr,
        changeRequestDetailsStr
      });
    } catch (err) {
      status = false;
      core.setFailed(err.message);
    }

    if (status) {
      let timeout = parseInt(core.getInput('timeout') || 100);
      let interval = parseInt(core.getInput('interval') || 3600);

      interval = interval>=100 ? interval : 100;
      timeout = timeout>=100? timeout : 3600;

      let start = +new Date();
      
      response = await tryFetch({
        start,
        interval,
        timeout,
        instanceUrl,
        toolId,
        username,
        passwd,
        jobname,
        githubContextStr
      });

      console.log('Get change status was successfull.');  
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();