module.exports = {
  mongodb: {
    host: process.env.MONGODB_HOST,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT || 6379,
  },
};
