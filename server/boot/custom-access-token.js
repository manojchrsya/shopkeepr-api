const loopback = require('loopback');

module.exports = function (app) {
  app.use(loopback.token({
    model: app.models.SkAccessToken,
  }));
};
