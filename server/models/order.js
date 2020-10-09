const _ = require('lodash');

module.exports = function (Order) {
  Order.STATUS_RECEIVED = 'RECEIVED';
  Order.STATUS_CANCELLED = 'CANCELLED';
  Order.STATUS_ACCEPTED = 'ACCEPTED';
  Order.STATUS_WORK_IN_PROGRESS = 'WORK_IN_PROGRESS';
  Order.STATUS_COMPLETED = 'COMPLETED';
  Order.STATUS_DELIVERED = 'DELIVERED';
  Order.STATUS_CLOSED = 'CLOSED';
  Order.VALID_STAUS = [Order.STATUS_RECEIVED, Order.STATUS_CANCELLED, Order.STATUS_ACCEPTED,
    Order.STATUS_WORK_IN_PROGRESS, Order.STATUS_COMPLETED, Order.STATUS_DELIVERED, Order.STATUS_CLOSED];

  Order.setup = function () {
    const OrderModel = this;
    async function isValidProductId(error, done) {
      const count = await Product.count({ id: this.productId });
      if (!count) {
        error();
      }
      return done();
    }
    async function isValidShopKeeperId(error, done) {
      const count = await ShopKeeper.count({ id: this.shopKeeperId });
      if (!count) {
        error();
      }
      return done();
    }
    OrderModel.validateAsync('customerId', isValidProductId, { message: 'Invalid customer.' });
    OrderModel.validateAsync('shopKeeperId', isValidShopKeeperId, { message: 'Invalid shopkeeper.' });
    OrderModel.validatesInclusionOf('status', { in: Order.VALID_STAUS });
    return OrderModel;
  };
  Order.setup();

  Order.observe('before save', (ctx) => {
    if (ctx.isNewInstance) {
      ctx.instance.status = Order.STATUS_RECEIVED;
    }
    return Promise.resolve();
  });

  Order.observe('after save', async (ctx) => {
    if (ctx.isNewInstance || (ctx.instance && !ctx.instance.orderNumber)) {
      const result = await Order.getOrderNumber(ctx.instance);
      let counterValue = result.value;
      counterValue = (counterValue < 999) ? `ORD-${(`000000${counterValue}`).slice(-6)}` : `ORD-${counterValue}`;
      // update jobCardId in jobCard instance
      await ctx.instance.updateAttributes({ orderNumber: counterValue });
    }
    Promise.resolve();
  });

  Order.getOrderNumber = async function (instance) {
    const [counter] = await Counter.findOrCreate({
      where: {
        counterableId: instance.shopKeeperId,
        counterableType: 'Order',
      },
    }, {
      counterableId: instance.shopKeeperId,
      counterableType: 'Order',
      value: 0,
    });
    return counter.updateAttributes({ value: counter.value + 1 });
  };

  Order.prototype.notifyShopKeeper = async function (options) {
    const { shopKeeperId, customerId } = options;
    const shopUsers = await SkUser.findByShopKeeperId(shopKeeperId, { fields: ['id'] });
    if (shopUsers.length === 0) return [];

    const [fcmTokens, customer] = await Promise.all([
      FcmToken.find({ where: { userId: { inq: _.map(shopUsers, 'id') } }, fields: ['id', 'fcmAccessToken'] }),
      Customer.findById(customerId, { fields: ['id', 'name'] }),
    ]);
    const params = {
      title: this.orderNumber,
      body: `Congrats!! got new order from ${_.startCase(_.toLower(customer.name))}`,
    };
    return Notification.send({
      shopKeeperId,
      customerId,
      tokens: _.map(fcmTokens, 'fcmAccessToken'),
      params,
    });
  };
};
