const kue = require('kue');
const _ = require('lodash');

class Base {
  constructor() {
    if (this.constructor === Base) {
      throw new TypeError('Can not construct Base Queue class as it is Abstract.');
    }
    // eslint-disable-next-line no-underscore-dangle
    this._queue = null;
  }

  getQueueModelName() {
    return this.constructor.name;
  }

  getQueueName() {
    return _.kebabCase(this.constructor.name);
  }

  queue() {
    // eslint-disable-next-line no-underscore-dangle
    if (this._queue === null) {
      const settings = {
        redis: {
          host: process.env.REDIS_HOST,
        },
      };
      if (process.env.REDIS_QUEUE_DB) {
        settings.redis.db = process.env.REDIS_QUEUE_DB;
      }
      // eslint-disable-next-line no-underscore-dangle
      this._queue = kue.createQueue(settings);
    }
    // eslint-disable-next-line no-underscore-dangle
    return this._queue;
  }

  add(options) {
    return new Promise((resolve, reject) => {
      const job = this.queue()
        .create(this.getQueueName(), options)
        .removeOnComplete(true)
        .save((err) => {
          if (err) {
            reject(err);
          }
          resolve(job.id);
        });
    });
  }

  consume(fn) {
    this.queue()
      .process(this.getQueueName(), fn);
  }
}

module.exports = Base;
