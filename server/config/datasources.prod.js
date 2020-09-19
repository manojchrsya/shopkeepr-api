module.exports = {
  mongodb: {
    auth: {
      username: process.env.MONGODB_USER,
      password: process.env.MONGODB_PASSWORD,
    },
    url: process.env.MONGODB_URL,
    protocol: process.env.MONGODB_PROTOCOL,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
  },
  filesystem: {
    url: process.env.ASSETS_URL,
  },
  storage: {
    root: process.env.ASSETS_PATH,
  },
};
