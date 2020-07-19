module.exports = {
  port: process.env.NODE_SERVER_PORT,
  elasticsearch: {
    hosts: [
      {
        protocol: process.env.ELASTICSEARCH_PROTOCOL || 'http',
        host: process.env.ELASTICSEARCH_HOST || '127.0.0.1',
        port: process.env.ELASTICSEARCH_PORT || 9200,
      },
    ],
  },
};
