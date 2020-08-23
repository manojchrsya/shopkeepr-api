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
};
