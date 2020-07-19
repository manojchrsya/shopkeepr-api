const BaseMasterData = require('./base-master-data');
const fs = require('fs');
const _ = require('lodash');
const promiseCSV = require('../lib/promise-csv.js');

const filePath = 'data-init/master-csv/shopkeeper-data.csv';

class ShopKeeperData extends BaseMasterData {
  run() {
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
        .then((shopkeepers) => {
          Promise.map(shopkeepers, shopkeeper => $this.prepareData(shopkeeper), { concurrency: 30 }).then(() => {
            resolve(true);
          });
        });
    });
  }

  prepareData(data) {
    const preparedData = {
      shopkeeper: {
        displayName: data.displayName,
        registeredName: data.registeredName,
        code: data.code,
        mobile: data.contactNumber,
        contactPerson: data.contactPerson,
        email: data.email,
        panNumber: data.panNumber,
        gstNumber: data.gstNumber,
        alternateContactNumber: data.alternateContactNumber,
        payments: {
          neft: {
            bankName: data.bankName,
            branchName: data.branchName,
            accountNumber: data.accountNumber,
            ifscCode: data.ifscCode,
          },
          upi: {
            id: data.upiId,
          },
        },
      },
      address: [{
        street: data.registeredStreet,
        location: data.registeredLocation,
        city: data.registeredCity,
        pincode: data.registeredPincode,
        type: 'registered',
        ownerType: 'ShopKeeper',
      }],
    };
    return this.saveData(preparedData);
  }

  saveData(data) {
    const self = this;
    return ShopKeeper.create(data.shopkeeper)
      .then(obj => Promise.all([
        self.activateShopKeeper(obj.id),
        self.saveAddress(data.address, obj.id),
      ]));
  }

  // eslint-disable-next-line class-methods-use-this
  activateShopKeeper(shopKeeperId) {
    return ShopKeeper.update({ id: shopKeeperId }, { status: 'ACTIVE' });
  }

  // eslint-disable-next-line class-methods-use-this
  saveAddress(data, shopKeeperId) {
    data.map((address) => { address.ownerId = shopKeeperId; return address; });
    return Address.create(data);
  }

  // eslint-disable-next-line class-methods-use-this
  saveCluster(data, shopKeeperId) {
    if (data.name !== '') {
      return SkCluster.findOrCreate({ name: data.name }, { name: data.name, workshops: [shopKeeperId] })
        .spread((instance) => {
          let shopkeepers = [];
          if (instance.shopkeepers) {
            shopkeepers = instance.shopkeepers.toJSON();
          }
          shopkeepers.push(shopKeeperId);
          return instance.updateAttributes({ shopkeeperIds: _.uniq(shopkeepers) });
        });
    }
  }
}

const object = new ShopKeeperData();

object.run(filePath);
