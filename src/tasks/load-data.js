const { readFile } = require('fs').promises;

/**
 * @param {Object} ctx Listr context, must contain `file`
 */
const taskLoadData = async ctx => {
  const data = await readFile(ctx.file, 'utf-8');
  if (data) {
    ctx.data = JSON.parse(data);
    return;
  }
  throw new Error(`Couldn't read content of ${ctx.file}!`);
};

module.exports = { taskLoadData };
