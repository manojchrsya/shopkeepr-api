module.exports = function (app) {
  const remotes = app.remotes();
  // Set X-Total-Count for all search requests
  remotes.after('*.find', function (ctx, next) {
    let filter = {};
    if (ctx.args && ctx.args.filter && ctx.args.filter.where) {
      filter = ctx.args.filter.where;
    }
    // check datasource name as this not support count methods
    // eslint-disable-next-line no-underscore-dangle
    if (!ctx.res._headerSent) {
      this.count(filter)
        .then((count) => {
          ctx.res.set('Access-Control-Expose-Headers', 'x-total-count');
          ctx.res.set('X-Total-Count', count);
          next();
        });
    } else {
      next();
    }
  });
};
