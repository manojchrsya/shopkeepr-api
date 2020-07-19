const _ = require('lodash');

module.exports = function (app) {
  _.each(app.models, (model) => {
    model.defineProperty('createdOn', {
      type: 'date',
      required: false,
    });

    model.defineProperty('updatedOn', {
      type: 'date',
      required: false,
    });

    model.defineProperty('createdBy', {
      type: 'string',
    });

    model.defineProperty('updatedBy', {
      type: 'string',
    });

    model.observe('before save', (ctx, next) => {
      if (ctx.isNewInstance) {
        ctx.instance.createdOn = new Date();
        ctx.instance.updatedOn = new Date();
        if (ctx.options.accessToken) {
          ctx.instance.createdBy = ctx.options.accessToken.userId;
          ctx.instance.updatedBy = ctx.options.accessToken.userId;
        }
        return next();
      } else if (ctx.instance) {
        ctx.Model.findById(ctx.instance.id)
          .then((modelInstance) => {
            ctx.instance.createdOn = modelInstance.createdOn ? modelInstance.createdOn : new Date();
            ctx.instance.updatedOn = new Date();
            if (ctx.options.accessToken) {
              ctx.instance.createdBy = modelInstance.createdBy ?
                modelInstance.createdBy :
                ctx.options.accessToken.userId;
              ctx.instance.updatedBy = ctx.options.accessToken.userId;
            }
            return next();
          })
          .catch(() => next());
      } else {
        ctx.data.updatedOn = new Date();
        if (ctx.options.accessToken) {
          ctx.data.updatedBy = ctx.options.accessToken.userId;
        }
        return next();
      }
    });
  });
};
