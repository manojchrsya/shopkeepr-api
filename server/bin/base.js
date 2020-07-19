
const app = require('../server');
const minimist = require('minimist');

class Base {
  constructor() {
    this.args = minimist(process.argv.slice(2));
    this.app = app;

    this.setup();

    return this;
  }

  // eslint-disable-next-line class-methods-use-this
  setup() {

  }

  // eslint-disable-next-line class-methods-use-this
  run() {
    return new Promise();
  }

  // eslint-disable-next-line class-methods-use-this
  exit() {
    process.exit(1);
  }
}

module.exports = Base;
