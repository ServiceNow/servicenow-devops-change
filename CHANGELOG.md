# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Added
- CHANGELOG can be parsed by the github action.
- New `abort-reason` output, set when the action fails, reporting whether the
  abort was caused by a timeout (`timeout`) or any other ServiceNow/API
  failure (`servicenow-error`).
