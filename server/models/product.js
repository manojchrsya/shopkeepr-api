
module.exports = function (Product) {
  Product.VALID_UNITS = ['LTR', 'PCS', 'PKT', 'UNT'];

  Product.setup = function () {
    const ProductModel = this;
    ProductModel.validatesInclusionOf('unit', { in: Product.VALID_UNITS });
    ProductModel.validatesNumericalityOf('price', { message: 'price is not valid.' });
    return ProductModel;
  };
  Product.setup();

  Product.observe('before save', (ctx) => {
    if (ctx.isNewInstance) {
      if (ctx.options.accessToken && ctx.options.accessToken.shopKeeperId) {
        ctx.instance.shopKeeperId = ctx.options.accessToken.shopKeeperId;
      }
    }
    return Promise.resolve();
  });
};
