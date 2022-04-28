const core = require('@actions/core');
const axios = require('axios');

async function createChange({
  instanceName,
  toolId,
  username,
  passwd,
  jobname,
  githubContextStr,
  changeRequestDetailsStr
}) {
   
    console.log('Calling Change Control API to create change....');
    
    let changeRequestDetails;

    try {
      changeRequestDetails = JSON.parse(changeRequestDetailsStr);
    } catch (e) {
        core.setFailed(`Failed parsing changeRequestDetails ${e}`);
        throw new Error("500");
    }

    let githubContext;

    try {
        githubContext = JSON.parse(githubContextStr);
    } catch (e) {
        core.setFailed(`Exception parsing github context ${e}`);
        throw new Error("500");
    }

    let payload;
    
    try {
        payload = {
            'toolId': toolId,
            'stageName': jobname,
            'buildNumber': `${githubContext.run_id}`,
            'attemptNumber': `${githubContext.run_attempt}`,
            'sha': `${githubContext.sha}`,
            'action': 'customChange',
            'workflow': `${githubContext.workflow}`,
            'repository': `${githubContext.repository}`,
            'branchName': `${githubContext.ref_name}`,
            'changeRequestDetails': changeRequestDetails
        };
    } catch (err) {
      core.setFailed(`Exception preparing payload: \n\n${err.toJSON}\n\n`);
      throw new Error("500");
    }

    const postendpoint = `https://${instanceName}.service-now.com/api/sn_devops/devops/orchestration/changeControl?toolId=${toolId}&toolType=github_server`;

    try {
        const token = `${username}:${passwd}`;
        const encodedToken = Buffer.from(token).toString('base64');

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + `${encodedToken}`
        };
        
        let httpHeaders = { headers: defaultHeaders };
        await axios.post(postendpoint, JSON.stringify(payload), httpHeaders);
    } catch (err) {
        core.setFailed(`Exception POSTing payload: \n\n${err.toJSON}\n\n`);
        throw new Error(`Internal server error. An unexpected error occurred while processing the request.`);
    }
}

module.exports = { createChange };