const winston = require('winston');
const { S3StreamLogger } = require('s3-streamlogger');
const _ = require('lodash');
const path = require('path');
const mkdirp = require('mkdirp');
const assert = require('assert');

class Logger {
  constructor(app) {
    this.config = app.get('logger');
    this.logger = new (winston.Logger)();

    this.logger.on('error', (error) => {
      // eslint-disable-next-line no-console
      console.log(error);
    });

    this.setup();
  }

  setup() {
    mkdirp.sync(this.getLogDir());

    const env = process.env.NODE_ENV || 'dev';
    if (env === 'dev') {
      this.addConsole();
      this.addFile();
    } else if (env === 'beta' || env === 'staging') {
      this.addConsole();
      this.addFile();
    } else if (env === 'prod') {
      this.addFile();
      // this.addS3Stream();
    }
  }

  get() {
    return this.logger;
  }

  // eslint-disable-next-line class-methods-use-this
  getLogDir() {
    return path.resolve(process.cwd(), 'runtime/logs');
  }

  addConsole(options) {
    options = _.defaults(options, {
      colorize: true,
      timestamp: true,
      prettyPrint: true,
      stderrLevels: ['error', 'debug', 'info'],
    });

    this.logger.add(winston.transports.Console, options);
  }

  addFile(options) {
    options = _.defaults(options, {
      timestamp: true,
      filename: path.resolve(`${this.getLogDir()}/dearo.log`),
      maxsize: 10 * 1024 * 1024,
    });

    this.logger.add(winston.transports.File, options);
  }

  addS3Stream(options) {
    assert(process.env.AWS_ACCESS_KEY_ID, 'Please set AWS_ACCESS_KEY_ID');
    assert(process.env.AWS_SECRET_ACCESS_KEY, 'Please set AWS_SECRET_ACCESS_KEY');

    this.config['s3-stream'].config.accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    this.config['s3-stream'].config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';

    // eslint-disable-next-line camelcase
    const streamConfig = _.defaults({ name_format: '%Y-%m-%d-%H-%M-%S-%L.log' }, this.config['s3-stream']);
    const s3Stream = new S3StreamLogger(streamConfig);
    s3Stream.on('error', (error) => {
      // eslint-disable-next-line no-console
      console.log(error);
    });

    options = _.defaults(options, {
      timestamp: true,
      level: 'info',
      name: 'info-log',
      stream: s3Stream,
    });
    this.logger.add(winston.transports.File, options);
  }
}

module.exports = Logger;
