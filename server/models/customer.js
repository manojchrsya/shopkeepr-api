const _ = require('lodash');
const isEmail = require('isemail');

module.exports = function (Customer) {
  Customer.setup = function () {
    const CustomerModel = this;

    CustomerModel.validatesFormatOf('mobile', {
      with: /^[6789]\d{9}$/,
      message: 'is not valid mobile number',
      allowNull: true,
      allowBlank: true,
    });

    CustomerModel.validatesFormatOf('alternateMobile', {
      with: /^[6789]\d{9}$/,
      message: 'is not valid alternate mobile number',
      allowNull: true,
      allowBlank: true,
    });

    function customEmailValid(error) {
      if (!_.isEmpty(this.email) && !isEmail.validate(this.email)) {
        error();
      }
    }
    CustomerModel.validate('email', customEmailValid, {
      message: 'provide a valid email',
    });
    return CustomerModel;
  };
  Customer.setup();

  Customer.observe('before save', (ctx) => {
    if (ctx.isNewInstance) {
      if (ctx.options.accessToken && ctx.options.accessToken.shopKeeperId) {
        ctx.instance.shopKeeperId = ctx.options.accessToken.shopKeeperId;
      }
    }
    return Promise.resolve();
  });

  Customer.prototype.addTransaction = async function (ctx, options) {
    const { remarks } = options;
    const actualAmount = options.actualAmount ? parseNumber(options.actualAmount) : 0;
    const receivedAmount = options.receivedAmount ? parseNumber(options.receivedAmount) : 0;
    const txnPromise = [];
    let settledAmount = 0;
    let creditAmount = 0;
    let debitAmount = 0;
    let invoice = {};
    // create invoice entry
    if (actualAmount > 0) {
      invoice = await Invoice.create({
        shopKeeperId: ctx.req.accessToken.shopKeeperId,
        customerId: this.id,
        amount: actualAmount,
        date: new Date(),
      });
    }
    // calculate settle, credit and debit amount
    if ((receivedAmount >= actualAmount)) {
      settledAmount = actualAmount;
      creditAmount = parseNumber(receivedAmount - actualAmount);
    } else if (receivedAmount < actualAmount) {
      settledAmount = receivedAmount;
      debitAmount = parseNumber(actualAmount - receivedAmount);
    }

    if (settledAmount > 0) {
      txnPromise.push(Transaction.create({
        shopKeeperId: ctx.req.accessToken.shopKeeperId,
        customerId: this.id,
        amount: settledAmount,
        remarks,
        type: Transaction.TYPE_SETTLED,
        invoiceId: invoice.id || '',
      }));
    }
    if (creditAmount > 0) {
      txnPromise.push(Transaction.create({
        shopKeeperId: ctx.req.accessToken.shopKeeperId,
        customerId: this.id,
        amount: creditAmount,
        remarks: settledAmount !== 0 ? 'Credit Amount' : remarks,
        type: Transaction.TYPE_CREDIT,
        invoiceId: invoice.id || '',
      }));
    }
    if (debitAmount > 0) {
      txnPromise.push(Transaction.create({
        shopKeeperId: ctx.req.accessToken.shopKeeperId,
        customerId: this.id,
        amount: debitAmount,
        remarks: settledAmount !== 0 ? 'Debit Amount' : remarks,
        type: Transaction.TYPE_DEBIT,
        invoiceId: invoice.id || '',
      }));
    }
    await Promise.all(txnPromise);
    return this.getDetails();
  };

  Customer.remoteMethod('prototype.addTransaction', {
    description: 'Save customer traction details.',
    accepts: [
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
      { arg: 'options', type: 'object', http: { source: 'body' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'post' },
  });

  Customer.prototype.getDetails = async function () {
    const [summary, customer] = await Promise.all([
      Transaction.getDetails({ customerIds: [this.id], type: Customer.modelName }),
      Customer.findById(this.id, { include: { relation: 'transactions', scope: { order: 'createdOn desc' } } }),
    ]);
    customer.summary = _.first(summary);
    return customer;
  };

  Customer.remoteMethod('prototype.getDetails', {
    description: 'Get customer transaction details.',
    accepts: [
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });

  Customer.getTxnDetail = async function (options = {}) {
    const { txnId } = options;
    return Transaction.findOneById(txnId, { include: 'customer' });
  };

  Customer.remoteMethod('getTxnDetail', {
    description: 'Get customer transaction details.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'query' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });

  Customer.deleteTransaction = async function (options = {}) {
    const { txnId } = options;
    const txnDetail = await Transaction.findOneById(txnId);
    if (!txnDetail) throw new BadRequestError('Invalid Transaction Id.');
    const promises = [];
    if (txnDetail.invoiceId) {
      promises.push(Invoice.deleteById(txnDetail.invoiceId));
      promises.push(Transaction.destroyAll({ invoiceId: txnDetail.invoiceId }));
    } else {
      promises.push(Transaction.deleteById(txnId));
    }
    await Promise.all(promises);
    return true;
  };

  Customer.remoteMethod('deleteTransaction', {
    description: 'Get customer transaction details.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'body' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'post' },
  });

  Customer.prototype.updateBucket = async function (options = {}) {
    const { productId, shopKeeperId } = options;
    const errors = {};
    if (!shopKeeperId) {
      errors.shopKeeperId = ['field is required.'];
    }
    if (!productId) {
      errors.productId = ['field is required.'];
    }
    if (!_.isEmpty(errors)) {
      const error = new BadRequestError('Invalid bucket data.');
      error.details = {
        messages: errors,
      };
      throw error;
    }
    const data = {
      productId,
      shopKeeperId,
      customerId: this.id,
      title: options.title,
      unit: options.unit,
      price: parseNumber(options.price) || 0,
      quantity: parseNumber(options.quantity) || 0,
    };
    data.amount = parseNumber(data.price * data.quantity);
    const [shopBucket, created] = await ShopBucket.findOrCreate({
      where: {
        productId: data.productId,
        customerId: data.customerId,
        shopKeeperId: data.shopKeeperId,
      },
    }, data);
    // remove product if quantity is 0
    if (data.quantity <= 0 && shopBucket) {
      await shopBucket.delete();
      return shopBucket;
    } else if (created) {
      return shopBucket;
    }
    shopBucket.unit = data.unit;
    shopBucket.price = data.price;
    shopBucket.quantity = data.quantity;
    shopBucket.amount = data.amount;
    return shopBucket.save();
  };

  Customer.remoteMethod('prototype.updateBucket', {
    description: 'Update shopping bucket details.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'body' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'post' },
  });

  Customer.findDetails = async function (options = {}) {
    const { shopKeeperId, mobile, name } = options;
    // validate details
    const errors = {};
    if (!shopKeeperId) {
      errors.shopKeeperId = ['field is required.'];
    }
    if (!mobile) {
      errors.mobile = ['field is required.'];
    }
    if (!name) {
      errors.name = ['field is required.'];
    }
    if (!_.isEmpty(errors)) {
      const error = new BadRequestError('Invalid user data.');
      error.details = {
        messages: errors,
      };
      throw error;
    }
    if (!shopKeeperId) throw new BadRequestError('ShopKeeperId is required.');
    const shopKeeperCount = await ShopKeeper.count({ id: shopKeeperId });
    if (!shopKeeperCount) throw new BadRequestError('Invalid ShopKeeperId.');
    // eslint-disable-next-line no-unused-vars
    const [customer, created] = await Customer.findOrCreate({
      where: { shopKeeperId, mobile },
    }, { shopKeeperId, mobile, name });
    return _.pick(customer, ['id', 'name', 'mobile']);
  };

  Customer.remoteMethod('findDetails', {
    description: 'Get customer transaction details.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'body' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'post' },
  });
  Customer.prototype.getBucket = async function (options = {}) {
    const { shopKeeperId } = options;
    return ShopBucket.find({ where: { customerId: this.id, shopKeeperId } });
  };

  Customer.remoteMethod('prototype.getBucket', {
    description: 'Get customer bucket details.',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'query' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });
};
