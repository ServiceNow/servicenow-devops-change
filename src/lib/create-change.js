const core = require('@actions/core');
const axios = require('axios');

async function createChange({
  instanceUrl,
  toolId,
  username,
  passwd,
  jobname,
  githubContextStr,
  changeRequestDetailsStr
}) {
   
    console.log('Calling Change Control API to create change....');
    
    let changeRequestDetails;
    let attempts = 0;

    try {
      changeRequestDetails = JSON.parse(changeRequestDetailsStr);
    } catch (e) {
        console.log(`Error occured with message ${e}`);
        throw new Error("Failed parsing changeRequestDetails");
    }

    let githubContext;

    try {
        githubContext = JSON.parse(githubContextStr);
    } catch (e) {
        console.log(`Error occured with message ${e}`);
        throw new Error("Exception parsing github context");
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
        console.log(`Error occured with message ${err}`);
        throw new Error("Exception preparing payload");
    }

    const postendpoint = `${instanceUrl}/api/sn_devops/devops/orchestration/changeControl?toolId=${toolId}&toolType=github_server`;
    let response;

    while (attempts < 3) {
        try {
            ++attempts;
            const token = `${username}:${passwd}`;
            const encodedToken = Buffer.from(token).toString('base64');

            const defaultHeaders = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': 'Basic ' + `${encodedToken}`
            };
            let httpHeaders = { headers: defaultHeaders };
            response = await axios.post(postendpoint, JSON.stringify(payload), httpHeaders);
            break;
        } catch (err) {
            if (!err.response) {
                throw new Error('ServiceNow DevOps Change is not created. Please check ServiceNow logs for more details.');
            }
            
            if ((err.response.status != 400) || ((attempts >= 3) && (err.response.status == 400))){
                throw new Error('ServiceNow DevOps Change is not created. Please check ServiceNow logs for more details.');
            }

            await new Promise((resolve) => setTimeout(resolve, 30000));
        }
    }
}

module.exports = { createChange };