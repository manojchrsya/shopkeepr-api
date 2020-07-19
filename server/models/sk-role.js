module.exports = function (SkRole) {
  SkRole.ROLE_DEARO_ADMIN = '$dearo-admin';
  SkRole.ROLE_VENDOR_CLUSTER = '$vendor-cluster';
  SkRole.ROLE_VENDOR_ADMIN = '$vendor-admin';

  SkRole.AuthenticateRole = function (context) {
    if (!context.modelId) {
      return Promise.resolve([]);
    }
    return context.model.findById(context.modelId);
  };

  SkRole.checkAuthenticated = function (context) {
    return !!((context.accessToken && context.accessToken.userId));
  };
};
