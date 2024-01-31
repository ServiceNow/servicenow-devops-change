# ServiceNow DevOps Change GitHub Action

This custom action needs to be added at step level in a job to create change in ServiceNow instance. Using this custom action in parallel jobs is not supported.

# Usage
## Step 1: Prepare values for setting up your secrets for Actions
- credentials (Devops integration token of a GitHub tool created in ServiceNow DevOps or username and password for a ServiceNow devops integration user)
- instance URL for your ServiceNow dev, test, prod, etc. environments
- tool_id of your GitHub tool created in ServiceNow DevOps

## Step 2: Configure Secrets in your GitHub Ogranization or GitHub repository
On GitHub, go in your organization settings or repository settings, click on the _Secrets > Actions_ and create a new secret.

For token based authentication which is available from v3.1.0, create secrets called 
- `SN_DEVOPS_INTEGRATION_TOKEN` required for token based authentication
- `SN_INSTANCE_URL` your ServiceNow instance URL, for example **https://test.service-now.com**
- `SN_ORCHESTRATION_TOOL_ID` only the **sys_id** is required for the GitHub tool created in your ServiceNow instance

For basic authentication , create secrets called 
- `SN_INSTANCE_URL` your ServiceNow instance URL, for example **https://test.service-now.com**
- `SN_DEVOPS_USER`
- `SN_DEVOPS_PASSWORD`
- `SN_ORCHESTRATION_TOOL_ID` only the **sys_id** is required for the GitHub tool created in your ServiceNow instance

## Step 3: Identify upstream job that must complete successfully before the job using this custom action will run
Use needs to configure the identified upstream job. See [test.yml](.github/workflows/test.yml) for usage.

## Step 4: Configure the GitHub Action if need to adapt for your needs or workflows

# For Token based Authentication which is available from v3.1.0 at ServiceNow instance
```yaml
deploy:
    name: Deploy
    needs: <upstream job>
    runs-on: ubuntu-latest
    steps:     
      - name: ServiceNow Change
        uses: ServiceNow/servicenow-devops-change@v3.1.0
        id: create
        with:
          devops-integration-token: ${{ secrets.SN_DEVOPS_INTEGRATION_TOKEN }}
          instance-url: ${{ secrets.SN_INSTANCE_URL }}
          tool-id: ${{ secrets.SN_ORCHESTRATION_TOOL_ID }}
          context-github: ${{ toJSON(github) }}
          job-name: 'Deploy'
          change-request: '{"setCloseCode":"true","autoCloseChange":true,"attributes":{"short_description":"Automated Software Deployment","description":"Automated Software Deployment.","assignment_group":"a715cd759f2002002920bde8132e7018","implementation_plan":"Software update is tested and results can be found in Test Summaries Tab; When the change is approved the implementation happens automated by the CICD pipeline within the change planned start and end time window.","backout_plan":"When software fails in production, the previous software release will be re-deployed.","test_plan":"Testing if the software was successfully deployed"}}'
          interval: '100'
          timeout: '3600'
          changeCreationTimeOut: '3600'
          abortOnChangeCreationFailure: true
          abortOnChangeStepTimeout: true
          deployment-gate: '{"environment":"deploymentgate","jobName":"Deploy"}'
      - name: Output of Change Creation
        run: echo "change-request-number = ${{ steps.create.outputs.change-request-number }}" >> $GITHUB_OUTPUT
```

# For Basic Authentication at ServiceNow instance
```yaml
deploy:
    name: Deploy
    needs: <upstream job>
    runs-on: ubuntu-latest
    steps:     
      - name: ServiceNow Change
        uses: ServiceNow/servicenow-devops-change@v3.1.0
        with:
          devops-integration-user-name: ${{ secrets.SN_DEVOPS_USER }}
          devops-integration-user-password: ${{ secrets.SN_DEVOPS_PASSWORD }}
          instance-url: ${{ secrets.SN_INSTANCE_URL }}
          tool-id: ${{ secrets.SN_ORCHESTRATION_TOOL_ID }}
          context-github: ${{ toJSON(github) }}
          job-name: 'Deploy'
          change-request: '{"setCloseCode":"true","autoCloseChange":true,"attributes":{"short_description":"Automated Software Deployment","description":"Automated Software Deployment.","assignment_group":"a715cd759f2002002920bde8132e7018","implementation_plan":"Software update is tested and results can be found in Test Summaries Tab; When the change is approved the implementation happens automated by the CICD pipeline within the change planned start and end time window.","backout_plan":"When software fails in production, the previous software release will be re-deployed.","test_plan":"Testing if the software was successfully deployed"}}'
          interval: '100'
          timeout: '3600'
          changeCreationTimeOut: '3600'
          abortOnChangeCreationFailure: true
          abortOnChangeStepTimeout: true
      - name: Output of Change Creation
        run: echo "change-request-number = ${{ steps.create.outputs.change-request-number }}" >> $GITHUB_OUTPUT

```
The values for secrets should be setup in Step 1. Secrets should be created in Step 2.

## Inputs

### `devops-integration-token`

**Optional**  DevOps Integration Token of GitHub tool created in ServiceNow instance for token based authentication.

### `devops-integration-user-name`

**Required**  DevOps Integration Username to ServiceNow instance. 

### `devops-integration-user-password`

**Required**  DevOps Integration User Password to ServiceNow instance. 

### `instance-url`

**Required**  URL of ServiceNow instance to create change in ServiceNow. 

### `tool-id`

**Required**  Orchestration Tool Id for GitHub created in ServiceNow DevOps

### `context-github`

**Required**  Github context contains information about the workflow run details.

### `job-name`

**Required**  Display name of the job given for attribute _name_ in which _steps_ have been added for this custom action. For example, if display name of job is _Deploy_ then job-name value must be _'Deploy'_

### `change-request`

The change request details to be used while creating change in ServiceNow instance. The change request is a JSON object surrounded by curly braces _{}_ containing key-value pair separated by a comma _,_. A key-value pair consists of a key and a value separated by a colon _:_. The keys supported in key-value pair are *setCloseCode*, *short_description*, *description*, *assignment_group*, *implementation_plan*, *backout_plan*, *test_plan*

### `interval`

The time in seconds to wait between trying the API. The default value is 100 seconds.

### `timeout`

The max. time in seconds to wait until the action should fail. The default value is 3600 seconds.

### `changeCreationTimeOut`

The maximum time in seconds to wait for change creation. The default value is 3600 seconds.

### `abortOnChangeCreationFailure`

This value will be used to resume or abort the pipeline if the change is not created within the mentioned time period (changeCreationTimeOut). The default value is true seconds.

### `abortOnChangeStepTimeout`

This value will be used to resume or abort the pipeline if the change step is not completed within the mentioned time period (timeout). The default value is true seconds.

## Outputs

### `change-request-number`

This change request number is provided as output upon successful creation of the change.

### `change-request-sys-id`

This change request sys id is provided as output upon successful creation of the change.

# Notices

## Support Model

ServiceNow customers may request support through the [Now Support (HI) portal](https://support.servicenow.com/nav_to.do?uri=%2Fnow_support_home.do).

## Governance Model

Initially, ServiceNow product management and engineering representatives will own governance of these integrations to ensure consistency with roadmap direction. In the longer term, we hope that contributors from customers and our community developers will help to guide prioritization and maintenance of these integrations. At that point, this governance model can be updated to reflect a broader pool of contributors and maintainers.
