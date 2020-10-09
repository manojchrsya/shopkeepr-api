const firebase = require('firebase-admin');
const config = require('../../fcm.config');

class Firebase {
  constructor() {
    firebase.initializeApp({
      credential: firebase.credential.cert(config),
    });
  }
  // eslint-disable-next-line class-methods-use-this
  sendNotification(tokens, message) {
    return firebase.messaging().sendToDevice(tokens, message);
  }
}
module.exports = Firebase;
