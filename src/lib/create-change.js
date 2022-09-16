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
    let status = false;

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
            status = true;
            break;
        } catch (err) {
            if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
                throw new Error('Invalid ServiceNow Instance URL. Please correct the URL and try again.');
            }
            
            if (err.message.includes('401')) {
                throw new Error('Invalid Credentials. Please correct the credentials and try again.');
            }
               
            if (err.message.includes('405')) {
                throw new Error('Response Code from ServiceNow is 405. Please correct ServiceNow logs for more details.');
            }

            if (!err.response) {
                throw new Error('No response from ServiceNow. Please check ServiceNow logs for more details.');
            }

            if (err.response.status == 500) {
                throw new Error('Response Code from ServiceNow is 500. Please check ServiceNow logs for more details.')
            }
            
            if (err.response.status == 400) {
                let errMsg = 'ServiceNow DevOps Change is not created. Please check ServiceNow logs for more details.';
                let responseData = err.response.data;
                if (responseData && responseData.error && responseData.error.message) {
                    errMsg = responseData.error.message;
                } else if (responseData && responseData.result && responseData.result.details && responseData.result.details.errors) {
                    errMsg = 'ServiceNow DevOps Change is not created. ';
                    let errors = err.response.data.result.details.errors;
                    for (var index in errors) {
                        errMsg = errMsg + errors[index].message;
                    }
                }
                if (errMsg.indexOf('callbackURL') == -1)
                    throw new Error(errMsg);
                else if (attempts >= 3) {
                    errMsg = 'Task/Step Execution not created in ServiceNow DevOps for this job/stage ' + jobname + '. Please check Inbound Events processing details in ServiceNow instance and ServiceNow logs for more details.';
                    throw new Error(errMsg);
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 30000));
        }
    }
    if (status) {
        var result = response.data.result;
        if (result && result.message) {
            console.log('\n     \x1b[1m\x1b[36m'+result.message+'\x1b[0m\x1b[0m');
        }
    }
}

module.exports = { createChange };