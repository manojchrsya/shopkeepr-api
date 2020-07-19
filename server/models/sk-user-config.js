// eslint-disable-next-line no-unused-vars
module.exports = function (SkUserConfig) {
  SkUserConfig.VALID_USER_TYPE = ['Admin', 'VendorCluster', 'Vendor'];

  SkUserConfig.setup = function () {
    const SkUserConfigModel = this;
    SkUserConfigModel.validatesInclusionOf('userType', {
      in: SkUserConfig.VALID_USER_TYPE,
    });
    return SkUserConfigModel;
  };
  SkUserConfig.setup();
};
