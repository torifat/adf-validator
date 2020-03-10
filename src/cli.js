#!/usr/bin/env node
'use strict';

const meow = require('meow');
const { existsSync } = require('fs');
const { tasks } = require('./validator');

const exitWithError = msg => {
  console.error(msg);
  process.exit(1);
};

const cli = meow(`
	Usage
	$ adfv <path_of_ADF>
`);

if (cli.input.length === 0) {
  exitWithError('Provide path of the file to validate!');
} else if (!existsSync(cli.input[0])) {
  exitWithError(`File ${cli.input[0]} doesn't exist!`);
}

tasks.run({ file: cli.input[0], stage: 'full' }).catch(error => {
  if (error.context && error.context.errors) {
    console.log('\n');
    console.log(error.context.errors);
  }
});
