module.exports = {
  apps: [
    {
      name: 'dearo-api',
      script: 'server/server.js',
      combine_logs: true,
      exec_mode: 'cluster',
      instances: 0,
      env: {
        // One of: dev, beta, staging, prod
        NODE_ENV: 'example',
        NODE_SERVER_PORT: 3200,
        SERVER_BASE_URL: 'https://example-base.dearo.in',

        // Elasticsearch Details
        ELASTICSEARCH_PROTOCOL: 'https',
        ELASTICSEARCH_HOST: 'es-dearo-host',
        ELASTICSEARCH_PORT: '9200',

        // Mongo details
        MONGODB_HOST: 'mongohost',
        MONGODB_PORT: 27017,

        // Redis Details
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_QUEUE_DB: 3,
        INSTANCE_TYPE: 'cars',
      },
    },
  ],
};
