const path = require('path');
const fs = require('fs');

exports.privateKey = fs.readFileSync(path.join(__dirname, '../private/privatekey.pem')).toString();
exports.certificate = fs.readFileSync(path.join(__dirname, '../private/certificate.pem')).toString();
