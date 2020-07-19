const _ = require('lodash');

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

  ShopKeeper.getSkConfig = function (ctx) {
    const shopKeeperDetail = {
      shopKeeperId: ctx.req.accessToken.shopKeeperId,
    };
    return SkConfig.getConfig(shopKeeperDetail);
  };

  ShopKeeper.remoteMethod('getSkConfig', {
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
};
