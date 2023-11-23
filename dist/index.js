/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 468:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(450);
const axios = __nccwpck_require__(645);

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
    let httpHeaders = {};
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
    core.debug("[ServiceNow DevOps], Sending Request for Create Change, Request Header :"+JSON.stringify(httpHeaders)+", Payload :"+JSON.stringify(payload)+"\n");
    var retry = true;
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
                } else if (responseData && responseData.result && responseData.result.details && responseData.result.details.errors) {
                    errMsg = 'ServiceNow DevOps Change is not created. ';
                    let errors = err.response.data.result.details.errors;
                    for (var index in errors) {
                        errMsg = errMsg + errors[index].message;
                    }
                }
                if (errMsg.indexOf('Waiting for Inbound Event') == -1) {
                    retry = true;
                } else if (attempts >= 3) {
                    retry = false;
                } else if (errMsg.indexOf('callbackURL') == -1) {
                    throw new Error(errMsg);
                }
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

/***/ }),

/***/ 86:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(450);
const axios = __nccwpck_require__(645);

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
        if(token !== '') {
          endpoint =  `${instanceUrl}/api/sn_devops/v2/devops/orchestration/changeStatus?toolId=${toolId}&stageName=${jobname}&pipelineName=${pipelineName}&buildNumber=${buildNumber}&attemptNumber=${attemptNumber}`;
          const defaultHeadersForToken = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'sn_devops.DevOpsToken '+`${toolId}:${token}`
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
    
        if (responseCode == 201) {
          if (changeState == "pending_decision") {
            if (isChangeDetailsChanged(prevPollChangeDetails, currChangeDetails)) {
              console.log('\n \x1b[1m\x1b[32m' + JSON.stringify(currChangeDetails) + '\x1b[0m\x1b[0m');
            }
            throw new Error(JSON.stringify({ "statusCode": "201", "details": currChangeDetails }));
          } else if((changeState == "failed")||(changeState == "error")) {
              throw new Error(JSON.stringify({ "status":"error","details": currChangeDetails.details }));
          } else if (changeState == "rejected") {
              if (isChangeDetailsChanged(prevPollChangeDetails, currChangeDetails)) {
                console.log('\n \x1b[1m\x1b[32m' + JSON.stringify(currChangeDetails) + '\x1b[0m\x1b[0m');
              }
              throw new Error("202");
          } else
              throw new Error("201");
        } else if (responseCode == 200) {
          if (isChangeDetailsChanged(prevPollChangeDetails, currChangeDetails)) {
            console.log('\n \x1b[1m\x1b[32m' + JSON.stringify(currChangeDetails) + '\x1b[0m\x1b[0m');
          }
          console.log('\n****Change is Approved.');
        } else
          throw new Error("500");

      return true;
    }
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

/***/ }),

/***/ 910:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(450);
const { doFetch } = __nccwpck_require__(86);

async function tryFetch({
  start = +new Date(),
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
}) {
    try {
        await doFetch({
          instanceUrl,
          toolId,
          username,
          passwd,
          token,
          jobname,
          githubContextStr,
          prevPollChangeDetails
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

        const errorMessage = error.message;
        if (errorMessage) {
          const errorObject = JSON.parse(errorMessage);
          if (errorObject && errorObject.statusCode == "201") {
            prevPollChangeDetails = errorObject.details;
          }else if(errorObject && errorObject.status == "error"){
            //throws error incase of status is 'error'
            throw new Error(errorObject.details);
          }
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
          token,
          jobname,
          githubContextStr,
          abortOnChangeStepTimeout,
          prevPollChangeDetails
        });
    }
}

module.exports = { tryFetch };


/***/ }),

/***/ 450:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 645:
/***/ ((module) => {

module.exports = eval("require")("axios");


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
const core = __nccwpck_require__(450);
const axios = __nccwpck_require__(645);
const { createChange } = __nccwpck_require__(468);
const { tryFetch } = __nccwpck_require__(910);

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
})();

module.exports = __webpack_exports__;
/******/ })()
;