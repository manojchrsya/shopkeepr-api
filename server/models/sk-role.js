module.exports = function (SkRole) {
  SkRole.ROLE_SYS_ADMIN = '$sys-admin';
  SkRole.ROLE_SK_ADMIN = '$sk-admin';

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
