/*
 * The parsers that actually grab the information from an
 * incoming IRC message. These include command parsing for
 * !myCommand style commands.
 */

const parsers = {
  username: '[a-z0-9_]{4,25}',
  command: new RegExp('^!([a-z]+)\\s*("*.*?"*\\s*)$','i'),
  args: new RegExp('([a-z0-9_\\.]+|".*?")\\s*', 'gi'),
  metadata: new RegExp('([a-z\-]+)=([^;]+)','gi'),
  badge: new RegExp('([a-z_]+)\/([0-9]+)','gi'),
  emote: new RegExp('([0-9]+):([0-9\-,]+)\/*', 'g')
};

// Literally just a set of current chatter usernames.
parsers.names = new RegExp(':' + parsers.username + 
    '\.tmi\.twitch\.tv 353 ' + parsers.username + 
    ' = #(' + parsers.username + ') :(.*?)$', 'i');

// Join, part, privmsg (chat messages), and whispers.
parsers.basic = new RegExp('(@.*? )?:(' + parsers.username +')!' + 
  parsers.username + '@' + parsers.username + 
  '\.tmi\.twitch\.tv ([a-z]+) #?(' + 
  parsers.username +')( :.*)?','i');

parsers.ban = new RegExp('@(.*) :tmi\.twitch\.tv CLEARCHAT #(' + 
  parsers.username + ') :(' + parsers.username + ')');

// Some meta data is redundant or not needed, 
// so we limit what we care about.
const supportedMeta = [
  'id', 'badges', 'color', 'user-id', 
  'mod', 'subscriber', 'user-type',
  'tmi-sent-ts', 'turbo', 'emotes',
  'ban-reason','ban-duration'
];

function parse(type, text, multi) {
  if(parsers[type]) {
    // For multiple matches in one string
    // we must use a loop because exec is required
    // for grouping
    if(multi === true) {
      let matches = [], matchTmp;
      do {
        matches.push((matchTmp = parsers[type].exec(text)));
      } while(matchTmp != null)

      matches.pop(); //remove the null element
      return matches;
    }

    return parsers[type].exec(text);
  }
};

function emotes(data) {
  let motes = [],
      matches = parse('emote', data, true);

  for(let m = 0; m < matches.length; m++) {
    let xs = matches[m][2].split(','); // indexes
    for(var x = 0; x < xs.length; x++) {
      let se = xs[x].split('-'); // start/end

      motes.push({
        id: matches[m][1],
        start: parseInt(se[0]),
        end: parseInt(se[1])
      });
    }
  }

  // We map sort the emotes by start index because
  // the original emotes listing does not
  let starts = motes.map((em,i) => [em.start, i]);
  starts.sort((a,b) => a[0] - b[0]);
  motes = starts.map((s) => motes[s[1]]);
  
  return motes;
};

function meta(metaString) {
  let metaList = parse('metadata', metaString, true),
      metaData = {};

  for(let t = 0; t < metaList.length; t++) {
    if(supportedMeta.includes(metaList[t][1])) {
      switch(metaList[t][1]) {
        case 'badges':
          metaData.badges = {};

          let badges = parse('badge', metaList[t][2], true);
          for(let b = 0; b < badges.length; b++) {
            metaData.badges[badges[b][1]] = badges[b][2];
          }

          break;
        case 'emotes':
          metaData.emotes = emotes(metaList[t][2]);
          break;
        case 'subscriber': // true/false flags
        case 'mod':
        case 'turbo':
          metaData[metaList[t][1]] = (metaList[t][2] == '1' ? true : false);
          break;
        case 'tmi-sent-ts': // sent timestap
          metaDatasent = new Date(parseInt(metaList[t][2])).toISOString();
          break;
        default:
          metaData[metaList[t][1]] = metaList[t][2];
          break;
      }
    }
  }

  return metaData
};

function args(argString) {
  let argsArray = [];

  if(argString && argString.length > 0) {
    let tmpArgs = parse('args', argString, true);
    
    for(let a = 0; a < tmpArgs.length; a++) {
      let arg = tmpArgs[a][1];

      if(arg.indexOf('"') === 0) {
        arg = tmpArgs[a][1].slice(1,-1); // don't include "s
      }

      if(!isNaN(arg)) {
        arg = Number(arg);
      }

      argsArray.push(arg);
    }
  }

  return argsArray;
};

function message(data) {
  let match;

  data.meta = meta(data.meta);

  if((match = parse('command', data.message))) {
    data.type = 'command';
    data.command = match[1];
    data.arguments = args(match[2]);
    delete data.message; // don't need the message on commands
  } else if(data.type === 'privmsg') {
    data.type = 'message';
  }

  return data;
};

module.exports = function(line) {
  let match, data = {};

  //JOIN, PART, and PRIVMSG
  if((match = parse('basic', line))) {
    data.type = match[3].toLowerCase();
    data.username = match[2];
    data.channel = match[4];

    switch(data.type) {
      case 'whisper':
      case 'privmsg':
        data.message = match[5].slice(2); //starts with ' :'
        data.meta = match[1].slice(1, -1); //starts with @ and ends with a space
        data = message(data);
        break;
    }  
  }

  //Check for NAMES data
  if((match = parse('names', line))) {
    data.type = 'names'; 
    data.users = match[2].split(' ');
  }

  if(match = parse('ban', line)) {
    data.type = 'ban';
    data.channel = match[2];
    data.username = match[3];
    
    const banMeta = meta(match[1]);
    if(banMeta['ban-duration']) {
      data.duration = banMeta['ban-duration'];
    }
  }

  return data;
};
