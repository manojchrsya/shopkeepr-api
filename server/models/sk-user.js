const isEmail = require('isemail');
const _ = require('lodash');
const bcrypt = require('bcrypt');

module.exports = (SkUser) => {
  SkUser.STATUS_ACTIVE = 'ACTIVE';
  SkUser.STATUS_INACTIVE = 'INACTIVE';
  SkUser.USER_TYPE_ADMIN = 'Admin';
  SkUser.USER_TYPE_CLUSTER = 'SkCluster';
  SkUser.USER_TYPE_SHOPKEEPER = 'ShopKeeper';

  SkUser.setup = function () {
    const SkUserModel = this;

    // SkUserModel.validatesAbsenceOf('mobile', {message: 'Mobile is required'});
    SkUserModel.validatesFormatOf('mobile', { with: /^[789]\d{9}$/, message: 'is not valid.', allowNull: false });
    SkUserModel.validatesUniquenessOf('mobile', { message: 'already exists in records.' });

    if (SkUserModel.alternateMobile) {
      SkUserModel.validatesFormatOf('alternateMobile', {
        with: /^[789]\d{9}$/,
        message: 'is not valid',
        allowNull: true,
      });
    }
    function emailValidator(error) {
      const { email } = this;
      if (email && !isEmail.validate(email)) {
        error();
      }
    }

    delete SkUserModel.validations.email;
    if (SkUserModel.email) {
      SkUserModel.validate('email', emailValidator, { message: 'Email is not valid' });
      SkUserModel.validatesUniquenessOf('email', { message: 'already exists in records.' });
    }
    SkUserModel.validatesInclusionOf('status', {
      in: [SkUserModel.STATUS_ACTIVE, SkUserModel.STATUS_INACTIVE],
    });
    return SkUserModel;
  };

  SkUser.setup();

  // check customer's mobile number should not get updated
  SkUser.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      ctx.instance.status = SkUser.STATUS_ACTIVE; // update status for new instance
      next();
    } else if (ctx.instance && typeof ctx.instance.mobile !== 'undefined') {
      const error = new BadRequestError('Mobile number can not be updated.');
      next(error);
    } else if (ctx.data && typeof ctx.data.mobile !== 'undefined') {
      const error = new BadRequestError('Mobile number can not be updated.');
      next(error);
    } else if (ctx.instance) {
      const userId = ctx.instance.id;
      SkUser.findById(userId)
        .then((user) => {
          if (user) {
            ctx.instance.mobile = user.mobile;
            next();
          }
          throw new BadRequestError('Vendor user not found in record.');
        })
        .catch((error) => {
          error = new BadRequestError(error.message);
          next(error);
        });
    } else {
      next();
    }
  });

  SkUser.isAdmin = function (userId) {
    return SkRoleMapping.findByPrincipalId(userId, { include: 'role' })
      .then((mappings) => {
        const roleName = [];
        _.each(mappings, (mapping) => {
          roleName.push(mapping.role().name);
        });

        return ((_.size(roleName) === 1 && _.head(roleName) === SkRole.ROLE_DEARO_ADMIN));
      });
  };

  SkUser.getUserType = async function (userId) {
    const count = await SkUser.count({ id: userId });
    if (!count) {
      throw new BadRequestError('User not found in records.');
    }
    return SkUser.USER_TYPE_SHOPKEEPER;
  };

  // get VendorId(s) for user/cluster-admin
  SkUser.getShopKeeperIdForUser = async function (ctx) {
    const shopKeeperIds = [];
    if (ctx.req && ctx.req.accessToken && ctx.req.accessToken.vendorId) {
      const { shopKeeperId } = ctx.req.accessToken;
      shopKeeperIds.push(shopKeeperId);
    }
    return shopKeeperIds;
  };

  SkUser.getConfig = async function (ctx) {
    let config = {};
    if (ctx.req.accessToken && ctx.req.accessToken.userId) {
      config = await SkUserConfig.findOneByUserId(ctx.req.accessToken.userId);
    }
    return _.omit(config.toJSON(), ['createdOn', 'updatedOn']);
  };

  SkUser.remoteMethod('getConfig', {
    description: 'Get User configurations.',
    accepts: [
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'get' },
  });

  SkUser.register = async function (data) {
    // validate details
    const errors = {};
    if (!data.business) {
      errors.business = ['field is required.'];
    }
    if (!data.email) {
      errors.email = ['field is required.'];
    }
    if (!data.name) {
      errors.name = ['field is required.'];
    }
    if (!data.password) {
      errors.password = ['field is required.'];
    }
    if (/^[a-zA-Z][0-9]$/.test(data.password)) {
      errors.password = ['should be alphanumeric only.'];
    }
    if (!_.isEmpty(errors)) {
      const error = new BadRequestError('Invalid user data.');
      error.details = {
        messages: errors,
      };
      throw error;
    }
    // check if email or mobile already exist
    const shopCount = await ShopKeeper.count({ email: data.email });
    if (shopCount !== 0) throw new BadRequestError('Shop already exist with provided email id.');
    // add business name and owner Name
    const business = {
      displayName: data.business,
      email: data.email,
      contactPerson: data.name,
      mobile: data.mobile,
      status: ShopKeeper.STATUS_ACTIVE,
    };
    const shopkeeper = await ShopKeeper.create(business);
    const shopUser = {
      shopKeeperId: shopkeeper.id,
      email: data.email,
      mobile: data.mobile,
      name: data.name,
      password: data.password,
      status: SkUser.STATUS_ACTIVE,
    };
    const user = await SkUser.create(shopUser);
    // assign role to shop user
    const role = await SkRole.findOneByName('$sk-admin');
    await SkRoleMapping.create({ principalType: 'USER', principalId: user.id, roleId: role.id });
    return user;
  };

  SkUser.remoteMethod('register', {
    description: 'Busines and User registration.',
    accepts: [
      { arg: 'data', type: 'object', http: { source: 'body' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'post' },
  });

  SkUser.login = async function (credentials = {}) {
    if (!credentials.email) {
      throw new BadRequestError('mobile is required.');
    }
    if (!credentials.password) {
      throw new BadRequestError('password is required.');
    }
    // get user detials
    const userQuery = {
      where: { email: credentials.email },
      include: [
        {
          relation: 'shop',
          scope: {
            include: ['logo'],
          },
        }, {
          relation: 'roles',
        },
      ],
    };
    const userData = await SkUser.findOne(userQuery);
    // validate password
    const isEqual = await bcrypt.compare(credentials.password, userData.password);
    if (!isEqual) {
      throw new BadRequestError('Incorrect Password');
    }
    if (!userData) {
      throw new UnauthorizedError('Email does not exist.');
    }
    if (userData.status === SkUser.STATUS_INACTIVE) {
      throw new BadRequestError('User is not activated.');
    }
    const userType = await SkUser.getUserType(userData.id);
    if (userType === SkUser.USER_TYPE_SHOPKEEPER && userData.shop().length === 0) {
      throw new BadRequestError('None of the shop assigned to the user.');
    }
    // creating the accesstoken for user
    const tokenObj = {
      ttl: SkUser.app.get('tokenTTL'),
    };
    if (userData.shopKeeperId) {
      tokenObj.workshopId = userData.shopKeeperId;
    }
    const token = await userData.createAccessToken(tokenObj, {});
    userData.token = token;
    return userData;
  };

  SkUser.remoteMethod('login', {
    description: 'Login with OTP code agaist the mobile number.',
    accepts: [
      {
        arg: 'credentials', type: 'object', required: true, http: { source: 'body' },
      },
    ],
    returns: {
      arg: 'status', type: 'object', root: true,
    },
    http: { verb: 'post' },
  });
};
