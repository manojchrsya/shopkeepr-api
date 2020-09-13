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
    return { transactions, summary: _.first(summary) };
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
    const txnSummary = await Transaction.getDetails({ shopKeeperId, startDate, endDate });
    const summary = _.first(txnSummary) || {
      credit: { total: 0 },
      debit: { total: 0 },
      revenue: { total: 0 },
      dueAmount: 0,
      advanceAmount: 0,
    };
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

  ShopKeeper.getCustomers = async function (ctx) {
    const { shopKeeperId } = ctx.req.accessToken;
    const customers = await Customer.findByShopKeeperId(shopKeeperId, { order: 'updatedOn desc' });
    const customerIds = _.map(customers, 'id');
    const txnDetails = await Transaction.getDetails({ customerIds, type: Customer.modelName });
    const customerTxns = _.groupBy(txnDetails, 'customerId');
    return customers.map((customer) => {
      const customerTxn = _.first(customerTxns[customer.id]) || {};
      customer.summary = customerTxn;
      return customer;
    });
  };

  ShopKeeper.remoteMethod('getCustomers', {
    description: 'Get customer listings with summary.',
    accepts: [
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });

  ShopKeeper.prototype.getProducts = async function (options = {}) {
    const { customerId } = options;
    const products = await Product.find({ where: { shopKeeperId: this.id } });
    if (customerId) {
      const bucket = await ShopBucket.find({ where: { customerId, shopKeeperId: this.id } });
      if (bucket.length) {
        const buckerProducts = _.groupBy(bucket, 'productId');
        products.map((product) => {
          if (buckerProducts[product.id] && buckerProducts[product.id].length > 0) {
            const bucketProduct = _.first(buckerProducts[product.id]);
            product.unit = bucketProduct.unit;
            product.quantity = bucketProduct.quantity;
          }
          return product;
        });
      }
    }
    return products;
  };

  ShopKeeper.remoteMethod('prototype.getProducts', {
    description: 'Get shopkeeper products list.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'query' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });

  ShopKeeper.prototype.placeOrder = async function (options = {}) {
    const { customerId, description } = options;
    if (!customerId) throw new BadRequestError('CustomerId is required.');
    const products = await ShopBucket.find({ where: { shopKeeperId: this.id, customerId } });
    const itemCount = products.length;
    if (itemCount === 0) throw new BadRequestError('No Item found in basket.');
    const amount = _.sumBy(products, 'amount') || 0;
    const order = await Order.create({
      shopKeeperId: this.id,
      customerId,
      description,
      amount,
      itemCount,
    });
    const data = [];
    // add orderId in product line items and push in new array
    products.forEach((product) => {
      product.orderId = order.id;
      data.push(_.omit(product, ['createdOn', 'updatedOn']));
    });
    // create order line item and remove product from bucket
    await Promise.all([
      OrderLineItem.create(data),
      ShopBucket.destroyAll({ shopKeeperId: this.id, customerId }),
    ]);
    return order;
  };

  ShopKeeper.remoteMethod('prototype.placeOrder', {
    description: 'Create customer order.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'body' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'post' },
  });

  ShopKeeper.getOrders = async function (options = {}, ctx) {
    const { customerId, orderType } = options;
    const query = { where: {} };
    if (ctx && ctx.req && ctx.req.accessToken && ctx.req.accessToken.shopKeeperId) {
      query.where.shopKeeperId = ctx.req.accessToken.shopKeeperId;
    } else if (customerId) {
      query.where.customerId = customerId;
    }
    if (orderType === 'open') {
      query.where.status = { nin: [Order.STATUS_DELIVERED, Order.STATUS_CLOSED, Order.STATUS_CANCELLED] };
    } else if (orderType === 'closed') {
      query.where.status = { inq: [Order.STATUS_DELIVERED, Order.STATUS_CLOSED, Order.STATUS_CANCELLED] };
    }
    query.include = [];
    query.include.push({ relation: 'customer', scope: { fields: ['name', 'mobile'] } });
    query.include.push({ relation: 'shop', scope: { fields: ['name', 'mobile'] } });
    query.order = 'updatedOn desc';
    return Order.find(query);
  };

  ShopKeeper.remoteMethod('getOrders', {
    description: 'Get shopkeeper or customer order list.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'query' } },
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });

  ShopKeeper.getOrderDetails = async function (options = {}, ctx) {
    const { customerId, orderId } = options;
    if (!orderId) throw new BadRequestError('OrderId field is required.');
    const query = { where: {} };
    if (ctx && ctx.req && ctx.req.accessToken && ctx.req.accessToken.shopKeeperId) {
      query.where.shopKeeperId = ctx.req.accessToken.shopKeeperId;
    } else if (customerId) {
      query.where.customerId = customerId;
    }
    query.where.id = orderId;
    query.include = [];
    query.include.push({ relation: 'customer', scope: { fields: ['name', 'mobile'] } });
    query.include.push({ relation: 'shop', scope: { fields: ['name', 'mobile'] } });
    query.include.push({ relation: 'lineItems' });
    return Order.findOne(query);
  };

  ShopKeeper.remoteMethod('getOrderDetails', {
    description: 'Get shopkeeper or customer order details.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'query' } },
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });

  ShopKeeper.prototype.updateOrderStatus = async function (options = {}, ctx = {}) {
    const { orderId, status } = options;
    if (!orderId) throw new BadRequestError('orderId field is required.');
    const { shopKeeperId } = ctx.req && ctx.req.accessToken;
    const order = await Order.findOne({ where: { id: orderId, shopKeeperId } });
    if (!order) throw new BadRequestError('Invalid orderId');
    if (status) order.status = status;
    return order.save();
  };

  ShopKeeper.remoteMethod('prototype.updateOrderStatus', {
    description: 'Update order status.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'body' } },
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'post' },
  });
};
