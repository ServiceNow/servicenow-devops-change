const core = require('@actions/core');
const axios = require('axios');

async function createChange({
    instanceUrl,
    toolId,
    username,
    passwd,
    token,
    jobname,
    githubContextStr,
    changeRequestDetailsStr,
    deploymentGateStr
}) {

    console.log('[ServiceNow DevOps] Calling Change Control API to create change....');

    let changeRequestDetails;
    let deploymentGateDetails;
    let githubContext;
    let payload;
    let postendpoint = '';
    let response;

    try {
        changeRequestDetails = JSON.parse(changeRequestDetailsStr);
    } catch (e) {
        displayErrorMsg(`[ServiceNow DevOps] Error occured with message ${e}`);
        throw new Error("Failed parsing changeRequestDetails");
    }

    try {
        if (deploymentGateStr)
            deploymentGateDetails = JSON.parse(deploymentGateStr);
    } catch (e) {
        displayErrorMsg(`[ServiceNow DevOps] Error occured with message ${e}`);
        throw new Error("Failed parsing deploymentGateDetails");
    }

    try {
        githubContext = JSON.parse(githubContextStr);
    } catch (e) {
        displayErrorMsg(`[ServiceNow DevOps] Error occured with message ${e}`);
        throw new Error("Exception parsing github context");
    }

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
        console.log(`[ServiceNow DevOps] Error occured with message ${err}`);
        throw new Error("Exception preparing payload");
    }

    if (token === '' && username === '' && passwd === '') {
        throw new Error('Either secret token or integration username, password is needed for integration user authentication');
    }
    else if (token !== '') {
        // Register the token so GitHub masks it everywhere in the workflow log.
        core.setSecret(token);
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
        // Register the credentials so GitHub masks them everywhere in the workflow log.
        core.setSecret(passwd);
        core.setSecret(encodedTokenForBasicAuth);

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
    core.debug("[ServiceNow DevOps] Sending Request for Create Change, Request Header :" + JSON.stringify(httpHeaders) + ", Payload :" + JSON.stringify(payload) + "\n");
    try {
        response = await postWithRedirects(postendpoint, JSON.stringify(payload), httpHeaders);
    } catch (err) {
        core.debug("[ServiceNow DevOps] Detailed error information:"+ JSON.stringify(err, null, 2));
        displayErrorMsg(`[ServiceNow DevOps] Error occurred with create change call  - Code: ${err.code}, Message: ${err.message}`);
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

            throw new Error(errMsg);
        }
    }
    return response
}

/**
 * Performs a POST request and follows HTTP redirects (3xx) manually.
 *
 * axios (via follow-redirects) can fail with ERR_FR_TOO_MANY_REDIRECTS when a
 * ServiceNow instance sits behind a proxy/load balancer that returns a redirect
 * (e.g. host canonicalization or http->https). By following the 'Location'
 * header ourselves we can re-issue the POST with the original body and headers
 * preserved, breaking out cleanly once a non-redirect response is received.
 */
async function postWithRedirects(url, data, config, maxRedirects = 5) {
    let currentUrl = url;

    // Track the full redirect chain so a failure can report every hop in one place.
    const redirectChain = [url];

    // Clone config/headers so cross-host header stripping never mutates the caller's object.
    const requestConfig = {
        ...config,
        headers: { ...(config && config.headers) },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
    };

    let redirectsFollowed = 0;

    for (;;) {
        const response = await axios.post(currentUrl, data, requestConfig);

        // Not a redirect -> this is the final response.
        if (response.status < 300) {
            return response;
        }

        // This is a redirect (3xx). Log the request that produced it and the full request/response
        // headers at info level, so the redirect behavior is visible without ACTIONS_STEP_DEBUG.
        // Headers are printed in full; the credential itself is masked in the workflow log by the
        // earlier core.setSecret() calls. Response headers such as Set-Cookie / Server / Via / X-Cache
        // are the key clues for why the server keeps redirecting (e.g. a cookie-based loop, or a
        // CDN/WAF/proxy in front of the instance) and why a manual curl may behave differently.
        const sentMethod = ((response.config && response.config.method) || 'post').toUpperCase();
        let sentHeaders;
        try {
            if (response.request && typeof response.request.getHeaders === 'function') {
                sentHeaders = response.request.getHeaders();
            }
        } catch (e) { /* getHeaders() not available on this request type; fall back below */ }
        if (!sentHeaders) {
            sentHeaders = (response.config && response.config.headers) || requestConfig.headers;
        }
        core.info(`[ServiceNow DevOps] Redirect (HTTP ${response.status}) received for ${sentMethod} ${currentUrl}`);
        core.info(`[ServiceNow DevOps]   request headers:  ${JSON.stringify(sentHeaders)}`);
        core.info(`[ServiceNow DevOps]   response headers: ${JSON.stringify(response.headers)}`);

        const location = response.headers && response.headers.location;
        if (!location) {
            throw new Error(`Redirect status ${response.status} received from ServiceNow but no 'Location' header was returned.`);
        }

        // Another redirect is being requested but we have already followed the maximum allowed.
        if (redirectsFollowed >= maxRedirects) {
            core.info(`[ServiceNow DevOps] Redirect chain (${redirectChain.length} URLs): ${redirectChain.join(' -> ')}`);
            throw new Error(`Maximum number of redirects (${maxRedirects}) exceeded while calling the ServiceNow Change Control API.`);
        }

        // Resolve relative redirect targets against the current URL.
        const redirectUrl = new URL(location, currentUrl).href;
        redirectsFollowed++;
        redirectChain.push(redirectUrl);
        core.info(`[ServiceNow DevOps] Following redirect #${redirectsFollowed} to ${redirectUrl}`);

        // Drop the Authorization header when redirected to a different host to avoid leaking credentials.
        const currentHost = new URL(currentUrl).hostname;
        const redirectHost = new URL(redirectUrl).hostname;
        if (currentHost !== redirectHost) {
            delete requestConfig.headers['Authorization'];
            delete requestConfig.headers['authorization'];
            core.info(`[ServiceNow DevOps] Dropped Authorization header for cross-host redirect (${currentHost} -> ${redirectHost}).`);
        }

        currentUrl = redirectUrl;
    }
}

function displayErrorMsg(errMsg) {
    console.error('\n\x1b[31m' + errMsg + '\x1b[31m');
    core.setFailed(errMsg);
}

module.exports = { createChange };
