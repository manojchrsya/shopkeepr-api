const request = require('request-promise');
const assert = require('assert');
const xml2js = require('xml2js');

const app = require('../server');

class Sms160By2 {
  constructor() {
    this.settings = app.get('sms-160by2');
    assert(this.settings.url, 'Please provide settings.url');
    assert(this.settings.token, 'Please provide settings.token');
  }

  send(options, callback) {
    // apiKey: this.settings.apiKey,
    // secretKey: this.settings.secretKey,
    const requestOptions = {
      url: this.settings.url,
      token: this.settings.token,
      mobile: options.mobile,
      text: options.message,
    };

    request.post(requestOptions)
      .on('response', (response) => {
        let data = '';
        response.setEncoding('utf8')
          .on('data', (chunk) => {
            data += chunk;
          })
          .on('end', () => {
            const parser = new xml2js.Parser({
              mergeAttrs: true,
              explicitArray: false,
            });
            parser.parseString(data, (error, json) => {
              callback(null, {
                raw: data,
                json,
              });
            });
          });
      })
      .on('error', (error) => {
        callback(error);
      });
  }
}

module.exports = Sms160By2;
