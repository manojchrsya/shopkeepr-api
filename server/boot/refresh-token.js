module.exports = function (app) {
  app.use((req, res, next) => {
    const token = req.accessToken;
    if (!token) {
      return next();
    }
    const now = new Date();
    // update the token once per day
    if ((now.getTime() - token.created.getTime()) < 86400) {
      return next();
    }
    // update the token and save the changes
    req.accessToken.created = now;
    req.accessToken.ttl = app.get('tokenTTL') ? app.get('tokenTTL') : 3000;
    /* session timeout in seconds */
    req.accessToken.save(next);
  });
};
