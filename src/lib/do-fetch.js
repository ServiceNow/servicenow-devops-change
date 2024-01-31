const core = require('@actions/core');
const axios = require('axios');

async function doFetch({
  instanceUrl,
  toolId,
  username,
  passwd,
  token,
  jobname,
  githubContextStr,
  prevPollChangeDetails
}) {


  let githubContext = JSON.parse(githubContextStr);

  const codesAllowedArr = '200,201,400,401,403,404,500'.split(',').map(Number);
  const pipelineName = `${githubContext.repository}` + '/' + `${githubContext.workflow}`;
  const buildNumber = `${githubContext.run_id}`;
  const attemptNumber = `${githubContext.run_attempt}`;

  let endpoint = '';
  let httpHeaders = {};

  let response = {};
  let status = false;
  let changeStatus = {};
  let responseCode = 500;

  try {
    if (token !== '') {
      endpoint = `${instanceUrl}/api/sn_devops/v2/devops/orchestration/changeStatus?toolId=${toolId}&stageName=${jobname}&pipelineName=${pipelineName}&buildNumber=${buildNumber}&attemptNumber=${attemptNumber}`;
      const defaultHeadersForToken = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'sn_devops.DevOpsToken ' + `${toolId}:${token}`
      };
      httpHeaders = { headers: defaultHeadersForToken };
    }
    else {
      endpoint = `${instanceUrl}/api/sn_devops/v1/devops/orchestration/changeStatus?toolId=${toolId}&stageName=${jobname}&pipelineName=${pipelineName}&buildNumber=${buildNumber}&attemptNumber=${attemptNumber}`;
      const tokenBasicAuth = `${username}:${passwd}`;
      const encodedTokenForBasicAuth = Buffer.from(tokenBasicAuth).toString('base64');

      const defaultHeadersForBasicAuth = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Basic ' + `${encodedTokenForBasicAuth}`
      };
      httpHeaders = { headers: defaultHeadersForBasicAuth };
    }
    response = await axios.get(endpoint, httpHeaders);
    status = true;
  } catch (err) {
    if (!err.response) {
      throw new Error("500");
    }

    if (!codesAllowedArr.includes(err.response.status)) {
      throw new Error("500");
    }

    if (err.response.status == 500) {
      throw new Error("500");
    }

    if (err.response.status == 400) {
      let responseData = err.response.data;
      if (responseData && responseData.result && responseData.result.errorMessage) {//Other technical error messages
        let errMsg = responseData.result.errorMessage;
        throw new Error(JSON.stringify({ "status": "error", "details": errMsg }));
      }

      throw new Error("400");
    }

    if (err.response.status == 401) {
      throw new Error("401");
    }

    if (err.response.status == 403) {
      throw new Error("403");
    }

    if (err.response.status == 404) {
      throw new Error("404");
    }
  }

  if (status) {
    try {
      responseCode = response.status;
    } catch (error) {
      core.setFailed('\nCould not read response code from API response: ' + error);
      throw new Error("500");
    }

    try {
      changeStatus = response.data.result;
    } catch (error) {
      core.setFailed('\nCould not read change status details from API response: ' + error);
      throw new Error("500");
    }

    let currChangeDetails = changeStatus.details;
    let changeState = currChangeDetails.status;

    if (currChangeDetails) {
      if (currChangeDetails.number)
        core.setOutput('change-request-number', currChangeDetails.number);
      if (currChangeDetails.sys_id)
        core.setOutput('change-request-sys-id', currChangeDetails.sys_id);
    }

    if (responseCode == 201) {
      if (changeState == "pending_decision") {
        if (isChangeDetailsChanged(prevPollChangeDetails, currChangeDetails)) {
          console.log('\n \x1b[1m\x1b[32m' + JSON.stringify(currChangeDetails) + '\x1b[0m\x1b[0m');
        }
        throw new Error(JSON.stringify({ "statusCode": "201", "details": currChangeDetails }));
      } else if ((changeState == "failed") || (changeState == "error")) {
        throw new Error(JSON.stringify({ "status": "error", "details": currChangeDetails.details }));
      } else if (changeState == "rejected" || changeState == "canceled_by_user") {
        if (isChangeDetailsChanged(prevPollChangeDetails, currChangeDetails)) {
          console.log('\n \x1b[1m\x1b[32m' + JSON.stringify(currChangeDetails) + '\x1b[0m\x1b[0m');
        }
        throw new Error("202");
      }
    }
    else if (responseCode == 200) {
      if (isChangeDetailsChanged(prevPollChangeDetails, currChangeDetails)) {
        console.log('\n \x1b[1m\x1b[32m' + JSON.stringify(currChangeDetails) + '\x1b[0m\x1b[0m');
      }
      console.log('\n****Change is Approved.');
    }
  }
  else
    throw new Error("500");

  return true;
}

function isChangeDetailsChanged(prevPollChangeDetails, currChangeDetails) {
  if (Object.keys(currChangeDetails).length !== Object.keys(prevPollChangeDetails).length) {
    return true;
  }
  for (let field of Object.keys(currChangeDetails)) {
    if (currChangeDetails[field] !== prevPollChangeDetails[field]) {
      return true;
    }
  }
  return false;
}

module.exports = { doFetch };