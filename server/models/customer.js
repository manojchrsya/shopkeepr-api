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
};
