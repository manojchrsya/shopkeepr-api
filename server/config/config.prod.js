module.exports = {
  host: process.env.NODE_SERVER_HOST || '0.0.0.0',
  port: process.env.NODE_SERVER_PORT || 6000,
  elasticsearch: {
    hosts: [
      {
        protocol: process.env.ELASTICSEARCH_PROTOCOL,
        host: process.env.ELASTICSEARCH_HOST,
        port: process.env.ELASTICSEARCH_PORT,
      },
    ],
  },
  filesystem: {
    url: process.env.ASSETS_URL,
  },
  baseUrl: process.env.SERVER_BASE_URL,
};
