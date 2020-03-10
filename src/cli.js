#!/usr/bin/env node
'use strict';

const meow = require('meow');
const chalk = require('chalk');
const { existsSync } = require('fs');

const { tasks } = require('./validator');
const { PACKAGE_NAME, SEMVER_REGEX, ONE_DAY } = require('./constants');

const exitWithError = msg => {
  console.error(chalk`{red ${msg}}`);
  process.exit(1);
};

const cli = meow(
  chalk`
  {bold Usage}
    $ adfv <file.adf.json>
    
  {bold Options}
    --stage-0           Validate against the {red.bold stage-0} ADF Schema  {gray [Default: false]}
    --version=<x.y.z>   Specify version of {underline ${PACKAGE_NAME}}  {gray [Default: latest]}
    --force             Ignore current cache and re-download the Schemas  {gray [Default: false]}
  
  {bold Examples}
    $ adfv sample-document-1.json
    $ adfv --stage-0 sample-document-2.json
    $ adfv --version=5.0.0 sample-document-3.json
    $ adfv --force --stage-0 sample-document-4.json

  {bold Notes}
    - By default it validates against the {green.bold full} ADF Schema.
  `,
  {
    flags: {
      'stage-0': {
        type: 'boolean',
        default: false,
      },
      version: {
        type: 'string',
      },
      force: {
        type: 'boolean',
        default: false,
      },
    },
  }
);

const { flags, input, showHelp } = cli;

let version;
const { force } = flags;
const stage = flags.stage0 ? 'stage-0' : 'full';
// Only Check for latest version once a day
// TODO: Add this as an option
const updateCheckInterval = process.env.ADFV_UPDATE_CHECK_INTERVAL || ONE_DAY;

// Validations
if (input.length === 0) {
  showHelp();
} else if (!existsSync(input[0])) {
  exitWithError(chalk`File {bold ${input[0]}} doesn't exist!`);
}

if (flags.version) {
  if (SEMVER_REGEX.test(flags.version)) {
    version = flags.version;
  } else {
    exitWithError(
      chalk`Please provide a proper version number! For example {bold 5.0.0}`
    );
  }
}

tasks
  .run({ file: input[0], stage, version, force, updateCheckInterval })
  .catch(error => {
    if (error.context && error.context.errors) {
      console.log('\n');
      console.log(error.context.errors);
    }
  });
