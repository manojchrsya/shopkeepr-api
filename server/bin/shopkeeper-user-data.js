const BaseMasterData = require('./base-master-data');
const fs = require('fs');
const promiseCSV = require('../lib/promise-csv.js');

const csvFilePath = 'data-init/master-csv/shopkeeper-user.csv';

class ShopKeeperUserData extends BaseMasterData {
  run(filePath) {
    const stream = fs.createReadStream(filePath);
    const options = { headers: true };

    stream.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.log(err);
      return err;
    });

    this.createPromise(stream, options)
      .then(() => {
        this.exit();
      });
  }

  createPromise(stream, options) {
    const $this = this;
    return new Promise((resolve) => {
      promiseCSV(stream, options)
        .then((ShopKeepers) => {
          Promise.map(ShopKeepers, ShopKeeper => $this.prepareData(ShopKeeper), { concurrency: 30 }).then(() => {
            resolve(true);
          });
        });
    });
  }

  async prepareData(data) {
    const shopKeeper = await ShopKeeper.findOneByCode(data.code);
    const preparedData = {
      name: data.name,
      mobile: data.mobile,
      shopKeeperId: shopKeeper.id,
      alternateMobile: data.alternateMobile,
      email: data.email,
      remarks: data.remarks,
    };
    return this.saveData(preparedData, data.role);
  }

  saveData(data, role) {
    const self = this;
    return SkUser.create(data)
      .then(obj => Promise.all([
        self.activateShopKeeperUser(obj.id),
        SkRole.findOneByName(role),
      ])
        .spread((userObj, roleObj) => SkRoleMapping.create({
          principalType: 'USER',
          principalId: obj.id,
          roleId: roleObj.id,
        })));
  }
  // eslint-disable-next-line class-methods-use-this
  activateShopKeeperUser(userId) {
    return SkUser.update({ id: userId }, { status: 'ACTIVE' });
  }
}

const object = new ShopKeeperUserData();

object.run(csvFilePath);
