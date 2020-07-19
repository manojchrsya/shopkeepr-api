module.exports = function (Model, options) {
  options.id = options.id || 'id';
  options.override = (options.override !== false);

  Model.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      if (options.override === true || (options.override === false && ctx.instance[options.id] === undefined)) {
        ctx.instance[options.id] = getUniqueId();
      }
    }
    next();
  });
};
