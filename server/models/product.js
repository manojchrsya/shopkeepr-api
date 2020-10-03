const _ = require('lodash');

module.exports = function (Product) {
  Product.STATUS_ACTIVE = 'ACTIVE';
  Product.STATUS_INACTIVE = 'INACTIVE';
  Product.VALID_UNITS = ['LTR', 'PCS', 'PKT', 'UNT', 'KG', '500 G', '250 G', '50 G'];

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
  Product.allowedContentTypes = function () {
    return ['image/jpg', 'image/jpeg', 'image/png'];
  };
  Product.prototype.getImagePath = function () {
    return _.join([
      ShopKeeper.modelName.toLowerCase(),
      this.shopKeeperId,
      Product.modelName.toLowerCase(),
      this.id, 'images',
    ], '/');
  };

  Product.prototype.uploadProductImage = async function (options = {}, ctx) {
    return FileStorage.uploadFile(ctx, {
      productId: this.id,
      modelName: Product.modelName,
      allowedContentTypes: Product.allowedContentTypes,
      ...options,
    });
  };

  Product.remoteMethod('prototype.uploadProductImage', {
    description: 'Upload product images',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'body' } },
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'post' },
  });

  Product.getCategories = async function (options) {
    const { shopKeeperId } = options;
    const productColl = await Product.getDBConnection();
    return productColl.distinct('categories', { shopKeeperId });
  };

  Product.prototype.deleteProductImage = async function (options = {}) {
    const { imageId } = options;
    if (!imageId) throw new BadRequestError('ImageId is required.');
    return FileStorage.deleteFile({
      productId: this.id,
      modelName: Product.modelName,
      fileId: imageId,
    });
  };

  Product.remoteMethod('prototype.deleteProductImage', {
    description: 'Upload product images',
    accepts: [
      { arg: 'options', type: 'object', http: { source: 'body' } },
      { arg: 'ctx', type: 'object', http: { source: 'context' } },
    ],
    returns: {
      arg: 'ctx', type: 'object', root: true,
    },
    http: { verb: 'post' },
  });
};
