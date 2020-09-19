

// require('debug').enable('loopback:security:*');

const loopback = require('loopback');
const boot = require('loopback-boot');

const http = require('http');
const path = require('path');
const https = require('https');
const sslConfig = require('./config/ssl-config');

const LoopbackConsole = require('loopback-console');

const startTime = new Date();

const app = loopback();
app.use('/assets', loopback.static(path.resolve(__dirname, '../assets')));
module.exports = app;

app.start = (httpOnly = process.env.HTTP) => {
  let server = null;
  if (!httpOnly) {
    const options = {
      key: sslConfig.privateKey,
      cert: sslConfig.certificate,
    };
    server = https.createServer(options, app);
  } else {
    server = http.createServer(app);
  }
  server.listen(app.get('port'), () => {
    const baseUrl = `${httpOnly ? 'http' : 'https'}://${app.get('host')}:${app.get('port')}`;
    app.emit('started', baseUrl);
    // eslint-disable-next-line no-console
    console.log('Web server listening @ %s%s', baseUrl, '/');
    if (app.get('loopback-component-explorer')) {
      const explorerPath = app.get('loopback-component-explorer').mountPath;
      // eslint-disable-next-line no-console
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
      // eslint-disable-next-line no-console
      console.log('Server started in: %s ', (new Date() - startTime));
    }
  });
  return server;
};

const configDirPath = './server/config';
const bootOptions = {
  appConfigRootDir: configDirPath,
  modelsRootDir: configDirPath,
  dsRootDir: configDirPath,
  middlewareRootDir: configDirPath,
  componentRootDir: configDirPath,
  mixinDirs: [
    './server/mixins',
  ],
  bootDirs: [
    './server/boot',
  ],
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, bootOptions, (error) => {
  if (error) throw error;

  if (LoopbackConsole.activated()) {
    LoopbackConsole.start(app, {
      prompt: 'shopkeepr > ',
      historyPath: `${process.cwd()}/data/console-history`,
    });
  } else if (require.main === module) {
    app.start();
  }
});
