const _ = require('lodash');
const Logger = require('../lib/logger');
const bluebird = require('bluebird');

module.exports = function (app) {
  const variables = {};

  variables.Promise = bluebird;

  variables.logger = new Logger(app).get();

  _.assign(global, variables);
};
