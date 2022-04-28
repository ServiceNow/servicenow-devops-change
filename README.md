# ServiceNow DevOps Change GitHub Action

This custom action needs to be added at step level in a job to create change in ServiceNow instance.

# Usage
## Step 1: Prepare values for setting up your secrets for Actions
- credentials (username and password for a ServiceNow devops integration user)
- instance URL for your ServiceNow dev, test, prod, etc. environments
- tool_id of your GitHub tool created in ServiceNow DevOps

## Step 2: Configure Secrets in your GitHub Ogranization or GitHub repository
On GitHub, go in your organization settings or repository settings, click on the _Secrets > Actions_ and create a new secret.

Create secrets called 
- `SN_DEVOPS_USER`
- `SN_DEVOPS_PASSWORD`
- `SN_INSTANCE_NAME` only the **domain** string is required from your ServiceNow instance URL, for example https://**domain**.service-now.com
- `SN_ORCHESTRATION_TOOL_ID` only the **sys_id** is required for the GitHub tool created in your ServiceNow instance

## Step 3: Configure the GitHub Action if need to adapt for your needs or workflows
```yaml
deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:     
      - name: Custom Change
        uses: ServiceNow/servicenow-devops-change@v1
        with:
          devops-integration-user-name: ${{ secrets.SN_DEVOPS_USER }}
          devops-integration-user-password: ${{ secrets.SN_DEVOPS_PASSWORD }}
          instance-name: ${{ secrets.SN_INSTANCE_NAME }}
          tool-id: ${{ secrets.SN_ORCHESTRATION_TOOL_ID }}
          context-github: ${{ toJSON(github) }}
          job-name: 'Deploy'
          change-request: '{"setCloseCode":"true","attributes":{"short_description":"Automated Software Deployment","description":"Automated Software Deployment.","assignment_group":"a715cd759f2002002920bde8132e7018","implementation_plan":"Software update is tested and results can be found in Test Summaries Tab; When the change is approved the implementation happens automated by the CICD pipeline within the change planned start and end time window.","backout_plan":"When software fails in production, the previous software release will be re-deployed.","test_plan":"Testing if the software was successfully deployed"}}'
          interval: '100'
          timeout: '3600'
```
The values for secrets should be setup in Step 1. Secrets should be created in Step 2.

## Inputs

### `devops-integration-user-name`

**Required**  DevOps Integration Username to ServiceNow instance. 

### `devops-integration-user-password`

**Required**  DevOps Integration User Password to ServiceNow instance. 

### `instance-name`

**Required**  Name of ServiceNow instance to send details required to create change. 

### `tool-id`

**Required**  Orchestration Tool Id for GitHub created in ServiceNow DevOps

### `context-github`

**Required**  Github context contains information about the workflow run details.

### `job-name`

**Required**  Display name of the job given for attribute _name_ in which _steps_ have been added for custom change action.

### `change-request`

The change request details to be used while creating change in ServiceNow instance. The change request is a JSON object surrounded by curly braces _{}_ containing key-value pair separated by a comma _,_. A key-value pair consists of a key and a value separated by a colon _:_. The keys supported in key-value pair are *setCloseCode* and *attributes* JSON object with supported keys *short_description*, *description*, *assignment_group*, *implementation_plan*, *backout_plan*, *test_plan*.

### `interval`

The time in seconds to wait between trying the API. The default value is 100 seconds.

### `timeout`

The max. time in seconds to wait until the action should fail. The default value is 3600 seconds.

## Outputs
No outputs produced.

# Notices

## Support Model

ServiceNow built this custom action with the intent to help customers get started faster in integrating ServiceNow DevOps with GitHub Actions, but __will not be providing formal support__. This integration is therefore considered "use at your own risk", and will rely on the open-source community to help drive fixes and feature enhancements via Issues. Occasionally, ServiceNow may choose to contribute to the open-source project to help address the highest priority Issues, and will do our best to keep the integrations updated with the latest API changes shipped with family releases. This is a good opportunity for our customers and community developers to step up and help drive iteration and improvement on these open-source integrations for everyone's benefit. 

## Governance Model

Initially, ServiceNow product management and engineering representatives will own governance of these integrations to ensure consistency with roadmap direction. In the longer term, we hope that contributors from customers and our community developers will help to guide prioritization and maintenance of these integrations. At that point, this governance model can be updated to reflect a broader pool of contributors and maintainers.