## ADF Validator

[ADF](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/) document validator

### Install

```
$ npm i -g adf-validator
$ # or
$ npm install --global adf-validator
```

### Usage

```
  $ adfv <file.adf.json>

  Options
    --stage-0           Validate against the stage-0 ADF Schema  [Default: false]
    --version <x.y.z>   Specify version of @atlaskit/adf-schema  [Default: latest]
    --force             Ignore current cache and re-download the Schemas  [Default: false]
    --schema <schema>   Use a local schema for validation. Ignores all online validation flags

  Examples
    $ adfv sample-document-1.json
    $ adfv --stage-0 sample-document-2.json
    $ adfv --version 5.0.0 sample-document-3.json
    $ adfv --force --stage-0 sample-document-4.json
    $ adfv --schema local-schema.json sample-document-4.json

  Notes
    - By default it validates against the full ADF Schema.
```

## Demo

[![ADF Validator](https://asciinema.org/a/l4i4yNQIOiGpox0fNPfZFjRWT.svg)](https://asciinema.org/a/l4i4yNQIOiGpox0fNPfZFjRWT)
