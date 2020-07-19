const BinBase = require('./base');
const csv = require('fast-csv');

class BaseMasterData extends BinBase {
  createPromise(stream, options) {
    const $this = this;
    const promises = [];

    return new Promise((resolve) => {
      csv.fromStream(stream, options)
        .on('data', (data) => {
          promises.push(new Promise((resolveData) => {
            resolveData($this.prepareData(data));
          }));
        })
        .on('end', () => {
          resolve(promises);
        });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  saveData(Model, data) {
    return Model.upsert(data).catch((error) => {
      // eslint-disable-next-line no-console
      console.log(`${data.id}::${error.message}`);
    });
  }
}

module.exports = BaseMasterData;
