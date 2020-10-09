const _ = require('lodash');
const Firebase = require('../lib/firebase');

// eslint-disable-next-line no-unused-vars
module.exports = function (Notification) {
  Notification.getFirebaseInstance = function () {
    if (!this.firebaseInstance) {
      this.firebaseInstance = new Firebase();
    }
    return this.firebaseInstance;
  };

  Notification.send = async function (options) {
    const log = await Notification.create({
      shopKeeperId: options.shopKeeperId,
      customerId: options.customerId,
      tokens: options.tokens,
      params: Notification.getFcmMessage(options.params),
    });
    return Notification.process(log);
  };

  Notification.process = async function (log) {
    try {
      const response = await Notification.getFirebaseInstance().sendNotification(log.tokens, log.params);
      log.sent = false;
      if (response.successCount > 0) {
        log.sent = true;
        log.error = false;
        log.response = response;
        log.sentOn = new Date();
      }
      if (response.failureCount > 0) {
        const errorDetails = [];
        _.each(response.results, (result) => {
          if (result.error && result.error.errorInfo) {
            errorDetails.push(result.error.errorInfo);
          }
        });
        log.error = true;
        log.errorDetails = errorDetails;
        log.errorOn = new Date();
      }
      await log.save();
    } catch (error) {
      await log.updateAttributes({
        sent: false,
        error: true,
        errorDetails: error.errorInfo,
        errorOn: new Date(),
      });
    }
    return log;
  };

  Notification.getFcmMessage = function (data) {
    return {
      notification: {
        title: data.title,
        body: data.body,
        click_action: data.screen,
      },
      data: {
        title: data.title,
        body: data.message,
        screen: data.screen,
      },
    };
  };
};
