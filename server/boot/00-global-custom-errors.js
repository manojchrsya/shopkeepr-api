const _ = require('lodash');
const CustomError = require('../lib/custom-error');

/**
 * Usage: throw new BadRequestError('Sorry, bad request!');
 * @param app
 */
module.exports = function (app) {
  const errors = {};
  errors.CustomError = CustomError;

  const errorsConfig = app.get('errors');
  _.each(errorsConfig, (ec) => {
    const className = `${_.upperFirst(_.camelCase(ec.code))}Error`;
    errors[className] = (class extends Error {
      constructor(message, options = {}) {
        super(message);
        this.name = className;
        this.statusCode = options.statusCode || ec.statusCode;
        this.code = options.code || ec.code;
        if (options.details) {
          this.details = options.details;
        }
      }
    });
  });

  _.assign(global, errors);
};
