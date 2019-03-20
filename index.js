const Twitchell = require('./lib/Twitchell');

module.exports = function(username, token, channels) {
  return new Twitchell(username, token, channels);
}