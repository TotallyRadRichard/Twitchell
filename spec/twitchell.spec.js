const config = require('./config.json'),
      twitchell = require('../index'),
      channels = [config.user.username];
      user = twitchell(config.user.username, config.user.token, channels),
      bot = twitchell(config.bot.username, config.bot.token, channels);

user.on('error', err => { console.log(err) });

describe('Twitchell Main Class', () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  
  it('should fire connect and channel events', done => {
    let counts = { 
      connects: 0,
      channels: 0
    };
    
    function update(type) {
      counts[type]++;

      if(counts.connects === 2 && counts.channels === 2) {
        done();
      }
    }

    const connect = () => { update('connects') };

    user.on('connect', connect);
    bot.on('connect', connect);

    user.on('channel', msg => {
      expect(msg.channel).toBe(config.user.username);
      expect(msg.username).toEqual(config.user.username);
      update('channels');
    });

    bot.on('channel', msg => {
      expect(msg.channel).toBe(config.user.username);
      expect(msg.username).toEqual(config.bot.username);
      update('channels');
    });
    
    bot.connect();
    user.connect();
  });

  it('should be able to send and receive messages', done => {
    let count = 0;

    user.on('message', msg => {
      expect(msg.username).toEqual(config.bot.username);

      if(++count === 2) {
        expect(msg.message).toBe('Test Success! 2');
        done();
      } else {
        expect(msg.message).toBe('Test Success!');
      }
    });

    bot.say('Test Success!');
    setTimeout(() => { bot.say('Test', 'Success!', '2'); }, 3000);
  });

  it('should be able to send and receive whispers', done => {
    user.on('whisper', msg => {
      expect(msg.channel).toBe(config.user.username);
      expect(msg.username).toEqual(config.bot.username);
      expect(msg.message).toBe('Whisper Test');
      done();
    });

    bot.whisper(config.user.username, 'Whisper', 'Test');
  });
});