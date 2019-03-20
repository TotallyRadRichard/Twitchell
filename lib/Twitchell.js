/*
 * @class Twitchell
 * Handles the IRC connection and firing events for messages.
 * Events fire are categorized by message type 
 * (join, ban, message, command, etc.)
 */

const EventEmitter = require('events'),
      tls = require('tls'),
      parse = require('./parser');

class Twitchell {
  constructor(username, token, channels) {
    this.username = username;
    this.token = token;
    this.channels = channels;
    this.socket = new tls.TLSSocket();

    // Since the socket is already an event emitter,
    // we can use it's event emitter, and allow binding
    // of its events as well as ours.
    this.on = this.socket.on.bind(this.socket);
    this.off = this.socket.removeListener.bind(this.socket);
    this.emit = this.socket.emit.bind(this.socket);

    this.on('data', this.onData.bind(this));
  }

  onData(data) {
    let lines = data.split('\r\n'), line;
  
    for(let l = 0; l < lines.length; l++) {
      // Keep alive is required to keep the connection open
      if(lines[l].indexOf('PING :tmi.twitch.tv') > -1) {
        this.send('PONG :tmi.twitch.tv');
        continue;
      }
  
      line = parse(lines[l]);
      
      if(line.type) {
        // Special channel event fired when 
        // the user enters a channel
        if(line.type == 'join' &&
          line.username == this.username && 
          this.channels.includes(line.channel))
        {
          line.type = 'channel';
        }
      
        this.emit(line.type, line);
      }
    }
  }

  send(...text) {
    this.socket.write(`${text.join(' ')} \r\n`);
  }

  login() {
    // Log the bot user into IRC
    this.send('PASS', this.token);
    this.send('NICK', this.username);
  
    // Destroy the token so its not floating in memory
    this.token = '';
    
    // Enable IRC V3 message tags
    this.send('CAP', 'REQ', ':twitch.tv/tags');
    
    // Enable membership events
    this.send('CAP', 'REQ', ':twitch.tv/membership');
  
    // Enable Twitch-specific IRC commands
    this.send('CAP', 'REQ', ':twitch.tv/commands');
  
    // Join all the channels
    for(let c = 0; c < this.channels.length; c++) {
      this.send('JOIN', `#${this.channels[c]}`);
    }
  }

  connect() {
    this.socket.connect({
      host: 'irc.chat.twitch.tv',
      port: 443
    });
  
    this.socket.setEncoding('utf8');
    this.socket.once('connect', () => {
      this.login();
    });
  }
}

module.exports = function(username, token, channels) {
  return new Twitchell(username, token, channels);
}