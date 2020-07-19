const Sms160By2 = require('../lib/sms-160by2');
const assert = require('assert');
const SmsQueue = require('../lib/queue/sms');
const ejs = require('ejs');

module.exports = function (Sms) {
  Sms.queue = new SmsQueue();

  Sms.send = function (options) {
    assert(typeof options === 'object', 'Sms options must be an object');
    assert(options.template, 'Sms template is mandatory');
    assert(options.mobile, 'Mobile is mandatory');

    SmsLog.create({
      template: options.template,
      mobile: options.mobile,
      params: options.params,
    })
      .then((log) => {
        Sms.queue.add({ id: log.id });
      });
  };

  Sms.consume = function () {
    Sms.queue.consume(Sms.process);
  };

  Sms.process = function (job, done) {
    SmsLog.findById(job.data.id)
      .then((log) => {
        if (!log) {
          done();
          return;
        }

        SmsTemplate.findById(log.template)
          .then((template) => {
            if (!template) {
              log.updateAttributes({
                error: true,
                errorOn: new Date(),
                errorDetails: 'Invalid Template',
              });
              done();
              return;
            }

            if (!template.isActive) {
              log.updateAttributes({
                error: true,
                errorOn: new Date(),
                errorDetails: 'Inactive Template',
              });
              done();
              return;
            }

            let message = template.text;
            if (log.params) {
              message = ejs.render(template.text, log.params, { rmWhitespace: true });
            }

            const options = {
              mobile: log.mobile,
              message,
            };

            const sms = new Sms160By2();
            sms.send(options, (error, response = {}) => {
              if (error) {
                log.updateAttributes({
                  message,
                  sent: false,
                  error: true,
                  errorDetails: error,
                  errorOn: new Date(),
                });
                done();
              }
              log.updateAttributes({
                message,
                sent: true,
                sentOn: new Date(),
                responseRaw: response.raw,
                response: response.json,
              });

              done();
            }, (error) => {
              // TODO: Implement delay & retries
              // eslint-disable-next-line no-console
              console.log(error);
            });
          });
      });
  };
};
