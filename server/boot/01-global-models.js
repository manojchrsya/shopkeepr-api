const _ = require('lodash');

module.exports = function (app) {
  _.assign(global, app.models);
};
