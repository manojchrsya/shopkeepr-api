const _ = require('lodash');
const moment = require('moment');

module.exports = function () {
  const validators = {};

  validators.validateMobile = function (mobile) {
    return /^[6789]\d{9}$/.test(mobile);
  };

  validators.validateOtp = function (otp) {
    return /^\d{6}$/.test(otp);
  };

  validators.validateRegistrationNo = function (regNo) {
    // eslint-disable-next-line no-useless-escape
    return /^[A-Z]{2}[\s-\.]?[0-9]{1,2}[\s-\.]?[0-9A-Z]{1,3}[\s-\.]?[0-9]{1,4}$/i.test(regNo);
  };

  validators.validateDateTime = function (dateTime) {
    dateTime = moment(dateTime).format('YYYY-MM-DD HH:mm:ss');
    return moment(dateTime, 'YYYY-MM-DD HH:mm:ss').isValid();
  };

  validators.dateTimeValidity = function (dateTime) {
    return moment().isBefore(moment(dateTime));
  };

  validators.validateGstNumber = function (gstNumber) {
    return /^\d{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z1-9]{1}[Z]{1}[A-Z\d]{1}$/i.test(gstNumber);
  };

  _.assign(global, validators);
};
