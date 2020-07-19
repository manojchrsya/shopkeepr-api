const _ = require('lodash');
const Base62 = require('base62');

module.exports = function () {
  const methods = {};

  methods.getRandomInt = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * ((max - min) + 1)) + min;
  };

  methods.getUniqueId = function () {
    return `${Date.now()}${methods.getRandomInt(111, 999)}`;
  };

  methods.generateOtp = function () {
    return Math.floor(Math.random() * 900000) + 100000;
  };

  methods.getRandomString = function () {
    return Base62.encode(methods.getUniqueId());
  };

  methods.parseNumber = function (number, decimalPoint = 2) {
    number = (typeof number === 'string') ? parseInt(number, 10) : number;
    return (Math.round(parseFloat(number.toFixed(decimalPoint)) * 100) / 100);
  };

  methods.escapeRegExp = function (text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  };

  methods.msToTime = (duration) => {
    const positiveDuration = (duration < 0) ? duration * -1 : duration;
    let minutes = parseInt((positiveDuration / (1000 * 60)) % 60, 10);
    let hours = parseInt((positiveDuration / (1000 * 60 * 60)), 10);
    hours = (hours < 10) ? `0${hours}` : hours;
    minutes = (minutes < 10) ? `0${minutes}` : minutes;
    const time = (duration < 0) ? `-${hours}:${minutes}` : `${hours}:${minutes}`;
    return time;
  };

  methods.stringToBoolean = function (value = '') {
    const boolValue = value ? value.toString().toLowerCase() : 'false';
    return ((boolValue === 'true') || (boolValue === '1'));
  };

  _.assign(global, methods);
};
