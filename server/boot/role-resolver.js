const _ = require('lodash');

module.exports = function () {
  SkRole.registerResolver('roleResolver', (role, context, cb) => {
    if (!SkRole.checkAuthenticated(context)) {
      return process.nextTick(() => cb(null, false));
    }
    const authError = new UnauthorizedError('Authorization Required', { code: 'AUTHORIZATION_REQUIRED' });
    const { userId } = context.accessToken;

    // check if user has ws-cluster, then vendor id has to be present in token
    SkRoleMapping.findByPrincipalId(userId, { include: 'role' })
      .then((mappings) => {
        const roleName = [];
        _.each(mappings, (mapping) => {
          roleName.push(mapping.role().name);
        });
        if ((_.size(roleName) === 1 &&
          (_.head(roleName) === SkRole.ROLE_DEARO_ADMIN ||
          _.head(roleName) === SkRole.ROLE_VENDOR_CLUSTER)) ||
          context.accessToken.shopKeeperId) {
          return SkRole.AuthenticateRole(context);
        }
        throw authError;
      })
      .then((data) => {
        if (!data) {
          return cb(authError);
        }
        // to check if vendor user accessing different vendor data
        if (context.modelId &&
           ((data.shopKeeperId && (context.accessToken.shopKeeperId !== data.shopKeeperId)) ||
           ((context.model.modelName === ShopKeeper.modelName) && (context.accessToken.shopKeeperId !== data.id)))) { // specific to vendor model
          return cb(authError);
        }

        return cb(null, true);
      })
      .catch(error => cb(error));
  });
};
