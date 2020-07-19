module.exports = function (server) {
  // Install a `/` route that returns server status
  const router = server.loopback.Router();
  if (process.env.NODE_ENV === 'prod') {
    router.get('/', (req, res) => {
      res.send('');
    });
  } else {
    router.get('/', server.loopback.status());
  }

  server.use(router);
};
