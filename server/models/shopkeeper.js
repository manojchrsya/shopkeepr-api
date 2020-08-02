const _ = require('lodash');
const moment = require('moment');

module.exports = function (ShopKeeper) {
  ShopKeeper.STATUS_ACTIVE = 'ACTIVE';
  ShopKeeper.STATUS_INACTIVE = 'INACTIVE';
  ShopKeeper.setup = function () {
    const ShopKeeperModel = this;

    if (ShopKeeperModel.panNumber) {
      ShopKeeperModel.validatesFormatOf('panNumber', {
        with: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i,
        message: 'is not valid.',
      });
    }

    if (ShopKeeperModel.gstNumber) {
      ShopKeeperModel.validatesFormatOf('gstNumber', {
        with: /^\d{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z1-9]{1}[Z]{1}[A-Z\d]{1}$/i,
        message: 'is not valid.',
      });
    }

    if (ShopKeeperModel.mobile) {
      ShopKeeperModel.validatesFormatOf('mobile', {
        with: /^[789]\d{9}$/,
        message: 'is not valid.',
        allowNull: true,
      });
    }
  };

  ShopKeeper.setup();

  ShopKeeper.observe('before save', (ctx, next) => {
    const ShopKeeperData = ctx.instance || ctx.data;
    let panNumber;

    if (ShopKeeperData.panNumber) {
      ShopKeeperData.panNumber = _.toUpper(ShopKeeperData.panNumber);
      // eslint-disable-next-line prefer-destructuring
      panNumber = ShopKeeperData.panNumber;
    } else if (ctx.currentInstance && ctx.currentInstance.panNumber) {
      // eslint-disable-next-line prefer-destructuring
      panNumber = ctx.currentInstance.panNumber;
    }

    if (ShopKeeperData.gstNumber) {
      ShopKeeperData.gstNumber = _.toUpper(ShopKeeperData.gstNumber);
    }

    if (ShopKeeperData.gstNumber && panNumber && ShopKeeperData.gstNumber.indexOf(panNumber) === -1) {
      return next(new BadRequestError('gstNumber is invalid.'));
    }

    next();
  });

  ShopKeeper.getShopConfig = function (ctx) {
    const shopKeeperDetail = {
      shopKeeperId: ctx.req.accessToken.shopKeeperId,
    };
    return SkConfig.getConfig(shopKeeperDetail);
  };

  ShopKeeper.remoteMethod('getShopConfig', {
    description: 'Get ShopKeeper configuration params.',
    accepts: [
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });

  ShopKeeper.getCluster = (shopKeeperId, option = {}) => {
    const { include } = option;
    const query = {
      where: { shopKeeperIds: { inq: [shopKeeperId] } },
      include,
    };
    return SkCluster.findOne(query);
  };

  ShopKeeper.getTxnDetails = async function (options = {}, ctx) {
    const { shopKeeperId } = ctx.req.accessToken;
    const startDate = options.date ? moment(options.date).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
    const endDate = moment(startDate).add(1, 'days').format('YYYY-MM-DD');
    const query = {
      where: {
        shopKeeperId,
        and: [
          { createdOn: { gte: startDate } },
          { createdOn: { lt: endDate } },
        ],
      },
      order: 'createdOn desc',
      include: {
        relation: 'customer',
        scope: {
          fields: ['id', 'name'],
        },
      },
    };
    const [summary, transactions] = await Promise.all([
      Transaction.getDetails({ shopKeeperId, startDate, endDate }),
      Transaction.find(query),
    ]);
    return { transactions, summary };
  };

  ShopKeeper.remoteMethod('getTxnDetails', {
    description: 'Get shopkeepers transaction details.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'query' } },
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });

  ShopKeeper.dashboard = async function (ctx) {
    const { shopKeeperId } = ctx.req.accessToken;
    const startDate = moment().startOf('month').format('YYYY-MM-DD');
    const endDate = moment().add(1, 'days').format('YYYY-MM-DD');
    const summary = await Transaction.getDetails({ shopKeeperId, startDate, endDate });
    summary.month = (moment().month(moment().month()).format('MMMM'));
    const lastWeek = await Transaction.getLastWeekDetails({ shopKeeperId });
    return { summary, lastWeek };
  };

  ShopKeeper.remoteMethod('dashboard', {
    description: 'Get shopkeepers dashoard details.',
    accepts: [
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });
};
