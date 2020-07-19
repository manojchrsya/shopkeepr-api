const _ = require('lodash');

module.exports = function (Address) {
  Address.pincodeRx = /^\d{6}$/;

  Address.setup = function () {
    const AddressModel = this;

    AddressModel.validatesLengthOf('pincode', {
      with: Address.pincodeRx,
      message: 'is not valid pin code number',
    });

    return AddressModel;
  };

  Address.setup();

  Address.observe('before save', (ctx, next) => {
    const instanceData = ctx.instance || ctx.data;
    if (instanceData && !instanceData.type && instanceData.ownerType === 'Customer') {
      instanceData.type = 'other';
    }
    if (instanceData.pincode) {
      Pincode.find({ where: { code: instanceData.pincode }, include: 'city' })
        .then((pincode) => {
          if (!pincode) {
            const error = new Error('Invalid pincode.');
            return Promise.reject(error);
          }
          const pincodeDetails = _.first(pincode);
          if (pincodeDetails.city) {
            instanceData.city = pincodeDetails.city.city;
            instanceData.state = pincodeDetails.city.state;
            instanceData.stateCode = pincodeDetails.city.stateCode;
          }
          return next();
        })
        .catch(error => next(new BadRequestError(error.message)));
    } else {
      return next();
    }
  });

  Address.prototype.toObjectOriginal = Address.prototype.toObject;

  Address.prototype.toObject = function (onlySchema, removeHidden, removeProtected) {
    const object = this.toObjectOriginal(onlySchema, removeHidden, removeProtected);
    object.full = this.getFullAddress();
    object.fullWithBreak = this.getFullAddress(true);
    return object;
  };

  Address.prototype.getFullAddress = function (isBreak) {
    const address = _.join(_.compact([this.street, this.location, this.city]), ', ');
    const addressWithBreak = _.join(_.compact([this.state, this.pincode]), ', ');
    if (isBreak) {
      return [address, addressWithBreak];
    }
    return `${address}, ${addressWithBreak}`;
  };

  Address.getShortAddress = function (address) {
    return `${_.join(_.compact([address.street, address.location, address.city]), ', ')} - ${address.pincode}`;
  };
};
