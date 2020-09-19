module.exports = {
  apps: [
    {
      name: 'shopkeepr-api',
      script: 'server/server.js',
      combine_logs: true,
      exec_mode: 'cluster',
      instances: 0,
      env: {
        // One of: dev, beta, staging, prod
        NODE_ENV: 'example',
        NODE_SERVER_PORT: 3200,

        // Elasticsearch Details
        ELASTICSEARCH_PROTOCOL: 'https',
        ELASTICSEARCH_HOST: 'es-shopkeepr-host',
        ELASTICSEARCH_PORT: '9200',

        // Mongo details
        MONGODB_HOST: 'mongohost',
        MONGODB_PORT: 27017,
        MONGODB_URL: 'mongo://mongodb/dbname',
        MONGODB_USER: 'test',
        MONGODB_PASSWORD: 'test@123',
        MONGODB_PROTOCOL: 'mongodb',

        // Redis Details
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
      },
    },
  ],
};
