const csv = require('fast-csv');
const Promise = require('bluebird');

const promiseCSV = Promise.method((stream, options) => new Promise((resolve) => {
  const records = [];
  csv
    .fromStream(stream, options)
    .on('data', (record) => {
      records.push(record);
    })
    .on('end', () => {
      resolve(records);
    });
}));

module.exports = promiseCSV;
