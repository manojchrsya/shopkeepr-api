const fs = require('fs-extra');
const _ = require('lodash');

module.exports = function (FileStorage) {
  FileStorage.getFileBucket = function () {
    return FileStorage.app.get('filesystem').container;
  };

  FileStorage.getFilePath = function () {
    const { root } = FileStorage.getDataSource().settings;
    return _.join([root, FileStorage.getFileBucket()], '/');
  };

  FileStorage.uploadFile = async function (ctx, options) {
    const container = FileStorage.getFileBucket();
    const pathDir = FileStorage.getFilePath();
    // create container if not exist in tmp directory
    if (!fs.existsSync(pathDir)) { fs.mkdirSync(pathDir); }
    return new Promise((resolve, reject) => {
      FileStorage.upload(container, ctx.req, ctx.res, options, async (error, fileObject) => {
        if (error) { reject(new BadRequestError('Error in uploading the file.')); }
        const fileDetails = fileObject.files.file[0];
        const uploadedPath = _.join([FileStorage.getFilePath(), fileDetails.name], '/');
        resolve(uploadedPath);
      });
    });
  };
};

