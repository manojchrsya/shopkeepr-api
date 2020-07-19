module.exports = function (app) {
  app.remotes().phases
    .addBefore('invoke', 'options-from-request')
    .use(async (ctx, next) => {
      if (!ctx.req || !ctx.req.accessToken) {
        return next();
      }

      try {
        const user = await SkUser.findOne({
          where: {
            id: ctx.req.accessToken.userId,
          },
          include: [{
            relation: 'cluster',
            scope: {
              fields: ['id', 'name', 'vendors'],
            },
          }],
        });
        ctx.req.currentUser = user;
        return next();
      } catch (error) {
        return next(new BadRequestError(error));
      }
    });
};
