/**
 * Usage: throw new CustomError('Custom Error Message');
 * @type {module.CustomError}
 */
module.exports = class CustomError extends Error {
  constructor(message, options = {}) {
    super(message);

    // Saving class name in the property of our custom error as a shortcut.
    this.name = this.constructor.name;

    this.statusCode = options.statusCode || 500;

    this.code = options.code || 'INTERNAL_SERVER_ERROR';

    if (options.details) {
      this.details = options.details;
    }
  }
};
