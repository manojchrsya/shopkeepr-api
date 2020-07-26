const _ = require('lodash');

module.exports = function (Model) {
  async function applyFilter(ctx) {
    ctx.args.filter = ctx.args.filter || {};
    ctx.args.filter.where = ctx.args.filter.where || {};
    const shopKeeperIds = await SkUser.getShopKeeperIdForUser(ctx);
    // check if shopKeeperIds is empty or not
    if (!_.isEmpty(shopKeeperIds)) {
      if (Model.modelName === ShopKeeper.modelName) {
        ctx.args.filter.where.id = ctx.args.filter.where.id || { inq: shopKeeperIds };
      } else {
        ctx.args.filter.where.shopKeeperId = ctx.args.filter.where.shopKeeperId || { inq: shopKeeperIds };
      }
    }
    return Promise.resolve();
  }

  async function applyFilterForCount(ctx) {
    const shopKeeperIds = await SkUser.getShopKeeperIdForUser(ctx);
    // check if shopKeeperIds is empty or not
    if (!_.isEmpty(shopKeeperIds)) {
      ctx.args.where.shopKeeperId = { inq: shopKeeperIds };
    }
    return Promise.resolve();
  }

  Model.beforeRemote('findOne', applyFilter);
  Model.beforeRemote('find', applyFilter);
  Model.beforeRemote('count', applyFilterForCount);
};
