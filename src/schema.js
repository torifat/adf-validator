'use strict';
const got = require('got');
const Conf = require('conf');
const Listr = require('listr');
const tempy = require('tempy');
const latestVersion = require('latest-version');

const { join } = require('path');
const { existsSync } = require('fs');
const { readFile, writeFile } = require('fs').promises;

const config = new Conf();

// Only Check for latest version once a day
const ONE_DAY = 1000 * 60 * 60 * 24;
const updateCheckInterval = ONE_DAY;

const downloadSchema = (path, version, stage = 'full') => {
  return async (ctx, task) => {
    const url = `https://unpkg.com/@atlaskit/adf-schema@${version}/dist/json-schema/v1/${stage}.json`;
    const response = await got(url).on('downloadProgress', progress => {
      task.output = progress.percent;
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
      title: 'Checking update interval',
      skip: () =>
        Date.now() - (config.get('lastUpdateCheck') || 0) < updateCheckInterval,
      task: async (ctx, task) => {
        const version = await latestVersion('@atlaskit/adf-schema');
        ctx.version = version;
        task.output = version;
        config.set('version', version);
        config.set('lastUpdateCheck', Date.now());
      },
    },
    {
      title: 'Getting version',
      skip: ctx => !!ctx.version,
      task: ctx => {
        const version = config.get('version');
        if (!version) {
          throw new Error(
            `Couldn't find ADF Schema version! Try a force update using :TODO:.`
          );
        }
        ctx.version = version;
      },
    },
    {
      title: 'Downloading',
      skip: async ctx => {
        const path = config.get(`schemas.${ctx.version}`);
        return path && existsSync(path)
          ? `Available from cache: ${path}`
          : false;
      },
      task: async (ctx, task) => {
        task.title = `Downloading ADF schema for @atlaskit/adf-schema v${ctx.version}`;

        const tmpDir = tempy.directory();
        config.set(`schemas.${ctx.version}`, tmpDir);

        return new Listr(
          [
            {
              title: 'Downloading Full ADF Schema',
              task: downloadSchema(tmpDir, ctx.version),
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
