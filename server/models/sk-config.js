const _ = require('lodash');
const SkConfigRuntime = require('../lib/sk-config-runtime');

module.exports = function (SkConfig) {
  SkConfig.MERGE_KEYS_TO_OMIT = [
    'id', 'configId', 'configType', 'createdBy', 'updatedBy', 'updatedOn', 'createdOn',
  ];

  SkConfig.getConfig = async function (options) {
    const skCluster = await SkCluster.findOneByShopKeeperIds(options.shopKeeperId);
    const configIds = [options.shopKeeperId];
    if (_.size(skCluster) > 0) {
      configIds.push(skCluster.id);
    }

    const config = await (this.find({ where: { configId: { inq: configIds } } }));
    if (_.size(config) < 1) {
      return Promise.reject(new BadRequestError('Shopkeeper Not Configured.'));
    }
    const updatedConfig = {};
    if (_.size(config) === 1) {
      // eslint-disable-next-line no-use-before-define
      _.keys(_.omit(config[0].toJSON(), SkConfig.MERGE_KEYS_TO_OMIT)).forEach((key) => {
        if (typeof config[0][key] !== 'undefined') {
          updatedConfig[key] = config[0][key];
        }
      });
      return new SkConfigRuntime(updatedConfig);
    }
    const skConfig = _.find(config, { configType: ShopKeeper.modelName }).toJSON();
    const SkClusterConfig = _.find(config, { configType: SkCluster.modelName }).toJSON();
    // override vendor config over cluster for array or object
    const mergedConfig = _.mergeWith(SkClusterConfig, skConfig, (value, source) => {
      if (typeof value === 'object') {
        return source;
      }
    });
    _.keys(_.omit(mergedConfig, SkConfig.MERGE_KEYS_TO_OMIT)).forEach((key) => {
      if (typeof mergedConfig[key] !== 'undefined') {
        updatedConfig[key] = mergedConfig[key];
      }
    });
    return new SkConfigRuntime(updatedConfig);
  };
};
