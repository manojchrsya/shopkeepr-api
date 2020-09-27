// eslint-disable-next-line no-unused-vars
const qt = require('quickthumb');

module.exports = function (FileResource) {
  FileResource.observe('after save', async (ctx) => {
    if (ctx.isNewInstance) {
      const { root } = FileStorage.getDataSource().settings;
      if (Product.allowedContentTypes().includes(ctx.instance.mime)) {
        const fileRootPath = [root, ctx.instance.path].join('/');
        await new Promise((resolve) => {
          qt.convert({ src: fileRootPath, dst: fileRootPath, width: 450 }, (error, data) => {
            resolve(data);
          });
        });
      }
    }
    return Promise.resolve();
  });
};

