'use strict';
const Ajv = require('ajv');
const Listr = require('listr');
const chalk = require('chalk');
const betterAjvErrors = require('better-ajv-errors');

const { schemaTasks } = require('./schema');
const { PACKAGE_NAME } = require('./constants');
const { taskLoadData } = require('./tasks/load-data');

const ajv = new Ajv({ jsonPointers: true });

const tasks = new Listr([
  {
    title: 'Loading ADF schema & data',
    enabled: ctx => ctx.file && ctx.stage,
    task: () =>
      new Listr(
        [
          {
            title: 'ADF schema',
            task: schemaTasks,
          },
          {
            title: 'Loading data',
            task: taskLoadData,
          },
        ],
        { concurrent: true }
      ),
  },
  {
    title: 'Validating',
    task: (ctx, task) => {
      const { schema, schemaJSON, data, version } = ctx;
      const usingText = schema
        ? chalk`using {bold local} schema`
        : chalk`using {underline ${PACKAGE_NAME}} v${version}`;
      task.title = `Validating ${usingText}`;
      const validate = ajv.compile(schemaJSON);
      const isValid = validate(data);
      if (!isValid) {
        ctx.errors = betterAjvErrors(schemaJSON, data, validate.errors, {
          indent: 2,
        });
        throw new Error('Validation failed!');
      } else {
        task.title = chalk`Successfully validated ${usingText}`;
      }
    },
  },
]);

module.exports = { tasks };
