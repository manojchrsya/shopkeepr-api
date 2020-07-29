const _ = require('lodash');
const isEmail = require('isemail');

module.exports = function (Customer) {
  Customer.setup = function () {
    const CustomerModel = this;

    CustomerModel.validatesFormatOf('mobile', {
      with: /^[6789]\d{9}$/,
      message: 'is not valid mobile number',
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

  Customer.prototype.addTransaction = function (ctx, options) {
    const { amount, type, remarks } = options;
    const transaction = {
      shopKeeperId: ctx.req.accessToken.shopKeeperId,
      customerId: this.id,
      amount,
      type,
      remarks,
    };
    return Transaction.create(transaction);
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
    // const trasactionDetails = await Transaction.getDetails({ customerId: this.id });
    return Customer.findById(this.id, { include: 'transactions' });
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
};
