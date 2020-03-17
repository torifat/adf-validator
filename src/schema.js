'use strict';
const got = require('got');
const Conf = require('conf');
const chalk = require('chalk');
const Listr = require('listr');
const tempy = require('tempy');
const latestVersion = require('latest-version');

const { join } = require('path');
const { existsSync } = require('fs');
const { readFile, writeFile } = require('fs').promises;

const { PACKAGE_NAME } = require('./constants');

const config = new Conf({ projectName: 'adf-validator' });

/**
 * Returns a async Listr task handler which downloads an ADF schema from unpkg.com
 * @param {string} path Path for storing the downloaded ADF Schema
 * @param {string} version Version of atlaskit/adf-schema npm package
 * @param {('full' | 'stage-0')} stage Stage of ADF Schema
 */
const downloadSchema = (path, version, stage) => {
  return async (ctx, task) => {
    const url = `https://unpkg.com/${PACKAGE_NAME}@${version}/dist/json-schema/v1/${stage}.json`;
    const response = await got(url).on('downloadProgress', progress => {
      task.output = `${progress.percent * 100}%`;
    });
    if (ctx.stage === stage) {
      ctx.schema = JSON.parse(response.body);
    }
    await writeFile(join(path, `${stage}.json`), response.body);
  };
};

const schemaTasks = () =>
  new Listr([
    {
      title: 'Fetching latest version from npm',
      skip: ctx =>
        ctx.version ||
        Date.now() - (config.get('lastUpdateCheck') || 0) <
          ctx.updateCheckInterval,
      task: async (ctx, task) => {
        const version = await latestVersion(PACKAGE_NAME);
        ctx.version = version;
        task.output = version;
        config.set('version', version);
        config.set('lastUpdateCheck', Date.now());
      },
    },
    {
      title: 'Retrieving stored version',
      skip: ctx => !!ctx.version,
      task: ctx => {
        const version = config.get('version');
        if (!version) {
          throw new Error(
            chalk`Couldn't find ADF Schema v${version} in Cache! Try passing {bold --force} option.`
          );
        }
        ctx.version = version;
      },
    },
    {
      title: 'Downloading',
      skip: async ctx => {
        const path = config.get(`schemas.${ctx.version}`);
        return !ctx.force && path && existsSync(path)
          ? `Available from cache: ${path}`
          : false;
      },
      task: async (ctx, task) => {
        task.title = `Downloading ADF schema for ${PACKAGE_NAME} v${ctx.version}`;

        const tmpDir = tempy.directory();
        config.set(`schemas.${ctx.version}`, tmpDir);

        return new Listr(
          [
            {
              title: 'Downloading Full ADF Schema',
              task: downloadSchema(tmpDir, ctx.version, 'full'),
            },
            {
              title: 'Downloading Stage 0 ADF Schema',
              task: downloadSchema(tmpDir, ctx.version, 'stage-0'),
            },
          ],
          { concurrent: true }
        );
      },
    },
    {
      title: 'Loading',
      skip: ctx => !!ctx.schema,
      task: async ctx => {
        const basePath = config.get(`schemas.${ctx.version}`);
        const schemaPath = join(basePath, `${ctx.stage}.json`);
        if (existsSync(schemaPath)) {
          const schema = await readFile(schemaPath, 'utf-8');
          if (schema) {
            ctx.schema = JSON.parse(schema);
            return;
          }
        }
        throw new Error(`Couldn't find ADF Schema file!`);
      },
    },
  ]);

module.exports = { schemaTasks };
