const _ = require('lodash');

class SkConfigRuntime {
  constructor(config = {}) {
    this.config = config;
  }

  get(key, defaultValue = undefined) {
    return _.get(this.config, key, defaultValue);
  }

  isEnabled(key) {
    key = this.normalizeKey(key);
    let enabled = false;
    for (let i = 0; i < key.length; i += 1) {
      const k = _.take(key, i + 1);
      // If key does not exist then Not Enabled
      if (!_.hasIn(this.config, k)) {
        enabled = false;
        break;
      }
      const val = _.get(this.config, k);
      // If key is not an object and value is set to false then also Not Enabled
      if (!_.isObject(val) && val === false) {
        enabled = false;
        break;
      }

      if (_.isObject(val)) {
        // If key is an object but enabled key does not exist in it then also Not Enabled
        if (!_.hasIn(val, 'enabled')) {
          enabled = false;
          break;
        }
        if (_.get(val, 'enabled') !== true) {
          enabled = false;
          break;
        }
      }
      // Otherwise Enabled
      enabled = true;
    }
    return enabled;
  }

  toJSON() {
    return this.config;
  }

  // eslint-disable-next-line class-methods-use-this
  normalizeKey(key) {
    if (!_.isArray(key)) {
      key = _.split(key, '.');
    }
    const newKey = [];
    _.forEach(key, (k) => {
      if (_.includes(k, '.')) {
        _.split(k, '.').forEach((ks) => {
          newKey.push(ks);
        });
      } else {
        newKey.push(k);
      }
    });
    return newKey;
  }
}

module.exports = SkConfigRuntime;
