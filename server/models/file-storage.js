const fs = require('fs-extra');
const _ = require('lodash');

module.exports = function (FileStorage) {
  FileStorage.getFileBucket = function () {
    return FileStorage.app.get('filesystem').container;
  };

  FileStorage.getFileBaseUrl = function () {
    return FileStorage.app.get('filesystem').url;
  };

  FileStorage.getFilePath = function () {
    const { root } = FileStorage.getDataSource().settings;
    return _.join([root, FileStorage.getFileBucket()], '/');
  };

  FileStorage.getFilename = function (file) {
    let ext = '.jpg';
    switch (file.type) {
      case 'image/jpeg':
      case 'image/jpg':
        ext = '.jpg';
        break;
      case 'image/png':
        ext = '.png';
        break;
      default:
        ext = '.jpg';
    }
    return getRandomString() + ext;
  };

  FileStorage.uploadFile = async function (ctx, options) {
    const container = _.join([FileStorage.getFileBucket()], '/');
    const pathDir = _.join([FileStorage.getFilePath(), options.path], '/');
    if (!fs.existsSync(pathDir)) { fs.mkdirSync(pathDir, { recursive: true }); }
    const fileOptions = {
      getFilename: FileStorage.getFilename,
      allowedContentTypes: options.allowedContentTypes,
    };
    return new Promise((resolve, reject) => {
      FileStorage.upload(container, ctx.req, ctx.res, fileOptions, async (error, fileObject) => {
        if (error) { return reject(new BadRequestError('Error in uploading the file.')); }
        const fileInfo = fileObject.files.file[0];
        const uploadedPath = _.join([FileStorage.getFileBucket(), fileInfo.name], '/');
        return resolve(FileResource.create({
          name: fileInfo.name,
          originalName: fileInfo.originalFilename,
          mime: fileInfo.type,
          bucket: FileStorage.getFileBucket(),
          path: uploadedPath,
          url: _.join([FileStorage.getFileBaseUrl(), uploadedPath], '/'),
          uploadableId: options.productId,
          uploadableType: options.modelName,
        }));
      });
    });
  };
};

