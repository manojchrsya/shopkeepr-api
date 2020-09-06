
module.exports = function (ShopBucket) {
  ShopBucket.setup = function () {
    const ShopBucketModel = this;
    async function isValidProductId(error, done) {
      const count = await Product.count({ id: this.productId });
      if (!count) {
        error();
      }
      return done();
    }
    ShopBucketModel.validateAsync('productId', isValidProductId, { message: 'Invalid product.' });
    return ShopBucketModel;
  };
  ShopBucket.setup();
  // ShopBucketModel.validateAsync('technicianId', isValidTechnicianId, { message: 'invalid technicianId.' });
  ShopBucket.observe('before save', async (ctx) => {
    if (ctx.isNewInstance) {
      if (ctx.options.accessToken && ctx.options.accessToken.shopKeeperId) {
        ctx.instance.shopKeeperId = ctx.options.accessToken.shopKeeperId;
      }
      // validate product, shopKeeper and customer
      const [product, shopKeeper, customer] = await Promise.all([
        Product.count({ id: ctx.instance.productId }),
        ShopKeeper.count({ id: ctx.instance.shopKeeperId }),
        Customer.count({ id: ctx.instance.customerId }),
      ]);
      if (!product) throw new BadRequestError('Invalid Product');
      if (!shopKeeper) throw new BadRequestError('Invalid ShopKeeper');
      if (!customer) throw new BadRequestError('Invalid Customer');
    }
    return Promise.resolve();
  });
};
