
module.exports = function (Product) {
  Product.STATUS_ACTIVE = 'ACTIVE';
  Product.STATUS_INACTIVE = 'INACTIVE';
  Product.VALID_UNITS = ['LTR', 'PCS', 'PKT', 'UNT', 'KG', 'GRAM'];

  Product.setup = function () {
    const ProductModel = this;
    ProductModel.validatesInclusionOf('unit', { in: Product.VALID_UNITS });
    return ProductModel;
  };
  Product.setup();

  Product.observe('before save', (ctx) => {
    if (ctx.isNewInstance) {
      if (ctx.options.accessToken && ctx.options.accessToken.shopKeeperId) {
        ctx.instance.shopKeeperId = ctx.options.accessToken.shopKeeperId;
      }
      ctx.instance.status = ctx.instance.status || Product.STATUS_ACTIVE;
    }
    return Promise.resolve();
  });
};
