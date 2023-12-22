const core = require('@actions/core');
const axios = require('axios');

function circularSafeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (key === '_sessionCache') return undefined;
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    });
}

async function createChange({
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
}) {

    console.log('Calling Change Control API to create change....');

    let changeRequestDetails;
    let deploymentGateDetails;
    let attempts = 0;
    changeCreationTimeOut = changeCreationTimeOut * 1000;

    try {
        changeRequestDetails = JSON.parse(changeRequestDetailsStr);
    } catch (e) {
        console.log(`Error occured with message ${e}`);
        throw new Error("Failed parsing changeRequestDetails");
    }

    try {
        if (deploymentGateStr)
            deploymentGateDetails = JSON.parse(deploymentGateStr);
    } catch (e) {
        console.log(`Error occured with message ${e}`);
        throw new Error("Failed parsing deploymentGateDetails");
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
        if (deploymentGateStr) {
            payload.deploymentGateDetails = deploymentGateDetails;
        }
    } catch (err) {
        console.log(`Error occured with message ${err}`);
        throw new Error("Exception preparing payload");
    }

    let postendpoint = '';
    let response;
    let status = false;

    if (token === '' && username === '' && passwd === '') {
        throw new Error('Either secret token or integration username, password is needed for integration user authentication');
    }
    else if (token !== '') {
        postendpoint = `${instanceUrl}/api/sn_devops/v2/devops/orchestration/changeControl?toolId=${toolId}&toolType=github_server`;
        const defaultHeadersForToken = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'sn_devops.DevOpsToken ' + `${toolId}:${token}`
        };
        httpHeaders = { headers: defaultHeadersForToken };
    }
    else if (username !== '' && passwd !== '') {
        postendpoint = `${instanceUrl}/api/sn_devops/v1/devops/orchestration/changeControl?toolId=${toolId}&toolType=github_server`;
        const tokenBasicAuth = `${username}:${passwd}`;
        const encodedTokenForBasicAuth = Buffer.from(tokenBasicAuth).toString('base64');

        const defaultHeadersForBasicAuth = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + `${encodedTokenForBasicAuth}`
        };
        httpHeaders = { headers: defaultHeadersForBasicAuth };
    }
    else {
        throw new Error('For Basic Auth, Username and Password is mandatory for integration user authentication');
    }
    var retry = true;
    core.debug("[ServiceNow DevOps], Sending Request for Create Change, Request Header :" + JSON.stringify(httpHeaders) + ", Payload :" + JSON.stringify(payload) + "\n");
    while (retry) {
        try {
            ++attempts;
            retry = false;
            httpHeaders.timeout = changeCreationTimeOut;
            payload.retryattempts = attempts;
            response = await axios.post(postendpoint, JSON.stringify(payload), httpHeaders);
            status = true;
            break;
        } catch (err) {
            if (err.code === 'ECONNABORTED') {
                throw new Error(`change creation timeout after ${err.config.timeout}s`);
            }

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
                } else if (responseData && responseData.result) {
                    let result = responseData.result;
                    if (result.details && result.details.errors) {
                        errMsg = 'ServiceNow DevOps Change is not created. ';
                        let errors = err.response.data.result.details.errors;
                        for (var index in errors) {
                            errMsg = errMsg + errors[index].message;
                        }
                    }
                    else if (result.errorMessage) {
                        errMsg = result.errorMessage;
                    }
                }
                if (errMsg.indexOf('Waiting for Inbound Event') == -1) {
                    retry = true;
                } else if (attempts >= 3) {
                    retry = false;
                } else if (errMsg.indexOf('callbackURL') == -1) {
                    throw new Error(errMsg);
                }
                if (!retry) {
                    core.debug("[ServiceNow DevOps], Receiving response for Create Change, Response :" + circularSafeStringify(response) + "\n");
                }
                await new Promise((resolve) => setTimeout(resolve, 30000));
            }
        }
        if (status) {
            var result = response.data.result;
            if (result && result.message) {
                console.log('\n     \x1b[1m\x1b[36m' + result.message + '\x1b[0m\x1b[0m');
            }
        }
    }
}
module.exports = { createChange };