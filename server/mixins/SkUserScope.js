module.exports = function (Model) {
  async function applyFilter(ctx) {
    ctx.args.filter = ctx.args.filter || {};
    ctx.args.filter.where = ctx.args.filter.where || {};
    ctx.args.filter.where.id = ctx.req.accessToken.userId;
    return Promise.resolve();
  }

  Model.beforeRemote('findOne', applyFilter);
};
