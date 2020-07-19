const isEmail = require('isemail');
const _ = require('lodash');

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

  /**
   *
   * @param credentials
   * @param include
   * @param callback
   * @returns {*}
   */

  SkUser.login = async function (credentials = {}) {
    if (!credentials.mobile) {
      throw new BadRequestError('mobile is required.');
    }
    if (!credentials.otp) {
      throw new BadRequestError('OTP code is required.');
    }
    if (!validateOtp(credentials.otp)) {
      throw new BadRequestError('OTP code should have alleast 6 digits.');
    }
    // verify the otp agaist the user model
    await SkUser.verifyOtp(credentials.mobile, credentials.otp);

    // get user detials
    const userQuery = {
      where: { mobile: credentials.mobile },
      include: {
        relation: 'shopKeeper',
        scope: {
          include: ['logo'],
        },
      },
    };
    const userData = await SkUser.findOne(userQuery);
    if (!userData) {
      throw new UnauthorizedError('Mobile number is not registered.');
    }
    if (userData.status === SkUser.STATUS_INACTIVE) {
      throw new BadRequestError('User is not activated.');
    }
    const userType = await SkUser.getUserType(userData.id);
    if (userType === SkUser.USER_TYPE_SHOPKEEPER && _.isEmpty(userData.shopKeeper())) {
      throw new BadRequestError('None of the Account assigned to the user.');
    }
    // creating the accesstoken for user
    const tokenObj = {
      ttl: SkUser.app.get('tokenTTL'),
    };
    const clusterLogo = null;
    if (userData.shopKeeperId) {
      tokenObj.shopKeeperId = userData.shopKeeperId;
    }
    const token = await userData.createAccessToken(tokenObj, {});
    userData.clusterLogo = clusterLogo;
    userData.token = token;
    return userData;
  };

  SkUser.remoteMethod(
    'login',
    {
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
    },
  );

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

  /**
   * [sendOTP send the otp code to registered mobile number if mobile number is not
   *  register then also show success message]
   * @param  {[type]}   mobile [description]
   * @param  {Function} callback     [description]
   * @return {[type]}          [description]
   */
  SkUser.generateOtp = async function (ctx, options) {
    const { mobile } = options;
    if (!mobile || !validateMobile(mobile)) {
      throw new BadRequestError('mobile is not valid.');
    }

    const userData = await SkUser.findOne({ where: { mobile } });
    if (!userData) {
      throw new UnauthorizedError('Mobile number is not registered.');
    }
    if (userData.status === SkUser.STATUS_INACTIVE) {
      throw new BadRequestError('User is not activated.');
    }
    const otp = generateOtp();

    try {
      await userData.updateAttributes({ otp });
      Sms.send({
        template: 'OTP',
        mobile: userData.mobile,
        params: {
          otp,
        },
      });
      return {
        status: 'success',
        message: 'OTP code is send successfully to registered user.',
      };
    } catch (error) {
      throw new BadRequestError(error.message);
    }
  };

  SkUser.remoteMethod(
    'generateOtp',
    {
      description: 'Send OTP to registered mobile number.',
      accepts: [
        { arg: 'ctx', type: 'object', http: { source: 'context' } },
        {
          arg: 'options', type: 'object', required: true, http: { source: 'body' },
        },
      ],
      returns: {
        arg: 'status', type: 'object', root: true,
      },
      http: { verb: 'post' },
    },
  );

  /**
   * [verifyOtp return the success response if otp is correct]
   * @param  {[type]}   mobile  [description]
   * @param  {[type]}   otp [description]
   * @param  {Function} next      [description]
   * @return {[type]}           [description]
   */
  SkUser.verifyOtp = async function (mobile, otp) {
    if (!validateMobile(mobile)) {
      throw new BadRequestError('mobile is not valid.');
    }
    if (!validateOtp(otp)) {
      throw new BadRequestError('otp is not valid.');
    }
    const userData = await SkUser.findOne({ where: { mobile } });
    if (!userData) {
      throw new UnauthorizedError('Mobile number is not registered.');
    }
    if (userData.status === SkUser.STATUS_INACTIVE) {
      throw new BadRequestError('User is not activated.');
    }
    if (userData.otp !== otp) {
      throw new BadRequestError('OTP code is Invalid.');
    }
    try {
      // eslint-disable-next-line quote-props
      await userData.updateAttributes({ 'otp': null });
      return {
        status: 'success',
        message: 'OTP Code verified successfully.',
      };
    } catch (error) {
      throw new BadRequestError(error.message);
    }
  };

  SkUser.remoteMethod(
    'verifyOtp',
    {
      description: 'Verify OTP code agaist the mobile number.',
      accepts: [
        {
          arg: 'mobile', type: 'string', required: true, http: { source: 'form' },
        },
        {
          arg: 'otp', type: 'string', required: true, http: { source: 'form' },
        },
      ],
      returns: {
        arg: 'status', type: 'object', root: true,
      },
      http: { verb: 'post' },
    },
  );

  // check customer's mobile number should not get updated
  SkUser.observe('before save', (ctx, next) => {
    if (ctx.isNewInstance) {
      ctx.instance.status = SkUser.STATUS_INACTIVE; // update status for new instance
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
};
