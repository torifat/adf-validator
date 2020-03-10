'use strict';
const Ajv = require('ajv');
const Listr = require('listr');
const betterAjvErrors = require('better-ajv-errors');

const { schemaTasks } = require('./schema');
const { readFile } = require('fs').promises;

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
            task: async ctx => {
              const data = await readFile(ctx.file, 'utf-8');
              if (data) {
                ctx.data = JSON.parse(data);
                return;
              }
              throw new Error(`Couldn't read content of ${ctx.file}!`);
            },
          },
        ],
        { concurrent: true }
      ),
  },
  {
    title: 'Validating',
    task: ctx => {
      const { schema, data } = ctx;
      const validate = ajv.compile(schema);
      const isValid = validate(data);
      if (!isValid) {
        ctx.errors = betterAjvErrors(schema, data, validate.errors, {
          indent: 2,
        });
        throw new Error('Validation failed!');
      }
    },
  },
]);

module.exports = { tasks };
