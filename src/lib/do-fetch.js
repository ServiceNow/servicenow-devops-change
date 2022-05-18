const core = require('@actions/core');
const axios = require('axios');

async function doFetch({
  instanceUrl,
  toolId,
  username,
  passwd,
  jobname,
  githubContextStr
}) {
    console.log(`\nPolling for change status..........`);

    let githubContext = JSON.parse(githubContextStr);
    
    const codesAllowedArr = '200,201,400,401,403,404,500'.split(',').map(Number);
    const pipelineName = `${githubContext.repository}` + '/' + `${githubContext.workflow}`;
    const buildNumber = `${githubContext.run_id}`;
    const attemptNumber = `${githubContext.run_attempt}`;

    const endpoint = `${instanceUrl}/api/sn_devops/devops/orchestration/changeStatus?toolId=${toolId}&stageName=${jobname}&pipelineName=${pipelineName}&buildNumber=${buildNumber}&attemptNumber=${attemptNumber}`;
    
    let response = {};
    let status = false;
    let changeStatus = {};
    let responseCode = 500;

    try {
        const token = `${username}:${passwd}`;
        const encodedToken = Buffer.from(token).toString('base64');

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + `${encodedToken}`
        };

        let httpHeaders = { headers: defaultHeaders };
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

        let details =  changeStatus.details;
        console.log('\n     \x1b[1m\x1b[32m'+JSON.stringify(details)+'\x1b[0m\x1b[0m');

        let changeState =  details.status;

        if (responseCode == 201) {
          if (changeState == "pending_decision") {
            throw new Error("201");
          } else
            throw new Error("202");
        }

        if (responseCode == 200) {
            console.log('\n****Change is Approved.');
        }
    } else
        throw new Error("500");

    return true;
}

module.exports = { doFetch };