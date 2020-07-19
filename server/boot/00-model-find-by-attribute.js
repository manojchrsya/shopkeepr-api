const _ = require('lodash');
const { mergeQuery } = require('loopback-datasource-juggler/lib/utils');

module.exports = function (app) {
  function getMethods(model) {
    return _.map(model.sharedClass.methods(), method => method.name);
  }

  function getProperties(model) {
    return _.keys(model.definition.properties);
  }

  function getFindMethods(properties) {
    return _.map(properties, property => _.camelCase(`findBy_${property}`));
  }

  function getFindOneMethods(properties) {
    return _.map(properties, property => _.camelCase(`findOneBy_${property}`));
  }

  function addFindMethod(model, property, method, one) {
    one = (one && one === true) || false;

    model[method] = function (value, filter, options, cb) {
      if (options === undefined && cb === undefined) {
        if (typeof filter === 'function') {
          // findById(id, cb)
          cb = filter;
          filter = {};
        }
      } else if (cb === undefined) {
        if (typeof options === 'function') {
          // findById(id, query, cb)
          cb = options;
          options = {};
          if (typeof filter === 'object' && !(filter.include || filter.fields)) {
            // If filter doesn't have include or fields, assuming it's options
            options = filter;
            filter = {};
          }
        }
      }

      options = options || {};
      filter = filter || {};
      let query = { where: {} };
      query.where[property] = value;
      query = mergeQuery(query, filter);
      if (!cb) {
        return model[one ? 'findOne' : 'find'].call(model, query, options);
      }
      return model[one ? 'findOne' : 'find'].call(model, query, options, cb);
    };
  }

  _.each(app.models, (model) => {
    const properties = getProperties(model);

    const methods = getMethods(model);

    const findMethods = getFindMethods(properties);

    const findDifference = _.difference(findMethods, methods);
    _.each(findDifference, (method) => {
      const property = _.camelCase(_.replace(method, 'findBy', ''));
      addFindMethod(model, property, method);
    });

    const findOneMethods = getFindOneMethods(properties);

    const findOneDifference = _.difference(findOneMethods, methods);
    _.each(findOneDifference, (method) => {
      const property = _.camelCase(_.replace(method, 'findOneBy', ''));
      addFindMethod(model, property, method, true);
    });

    model.getDBConnection = function () {
      return model.getDataSource().connector.collection(model.modelName);
    };
  });
};
