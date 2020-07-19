module.exports = function (Pincode) {
  Pincode.setup = function () {
    const PincodeModel = this;

    function validateStateCity(error, done) {
      StateCity.count({
        stateSlug: this.stateSlug,
        citySlug: this.citySlug,
      })
        .then((stateCityCount) => {
          if (stateCityCount === 0) {
            error();
          }
          done();
        });
    }
    PincodeModel.validateAsync('stateSlug', validateStateCity, { message: 'Invalid state and city.' });

    return PincodeModel;
  };

  Pincode.setup();
};
