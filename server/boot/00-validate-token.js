module.exports = function (app) {
  app.use((req, res, next) => {
    let tokenId;
    if (req.query && req.query.access_token) {
      tokenId = req.query.access_token;
    } else if (req.headers && req.headers.authorization) {
      tokenId = req.headers.authorization;
    }
    if (tokenId) {
      // check Access token exist in db
      SkAccessToken.findById(tokenId, (error, accessToken) => {
        if (!accessToken) {
          return next(new UnauthorizedError('Invalid Access Token', {
            code: 'INVALID_TOKEN',
          }));
        }
        return next();
      });
    } else {
      return next();
    }
  });
};
