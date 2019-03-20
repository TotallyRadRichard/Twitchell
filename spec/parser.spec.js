const parse = require('../lib/parser');

describe('Message Parsing', () => {
  it('should parse join messages', () => {
    const msg = parse(':ronni!ronni@ronni.tmi.twitch.tv JOIN #dallas');

    expect(msg.type).toBe('join');
    expect(msg.channel).toBe('dallas');
    expect(msg.username).toEqual('ronni');
  });

  it('should parse names messages', () => {
    const msg = parse(':ronni.tmi.twitch.tv 353 ronni = #dallas :ronni fred wilma');

    expect(msg.type).toBe('names');
    expect(msg.users).toEqual(['ronni','fred','wilma']);
  });

  it('should parse part (leave) messages', () => {
    const msg = parse(':ronni!ronni@ronni.tmi.twitch.tv PART #dallas');

    expect(msg.type).toBe('part');
    expect(msg.channel).toBe('dallas');
    expect(msg.username).toEqual('ronni');
  });

  it('should parse full chat messages (with badges)', () => {
    const msg = parse('@badges=global_mod/1,turbo/1;color=#0D4200;'
      + 'display-name=dallas;emotes=25:0-4,12-16/1902:6-10;id=b34ccfc7-4977-403a-8a94-33c6bac34fb8;'
      + 'mod=0;room-id=1337;subscriber=0;tmi-sent-ts=1507246572675;turbo=1;user-id=1337;'
      + 'user-type=global_mod :ronni!ronni@ronni.tmi.twitch.tv PRIVMSG #dallas :Kappa Keepo Kappa');

    expect(msg.username).toBe('ronni');
    expect(msg.channel).toBe('dallas');
    expect(msg.message).toBe('Kappa Keepo Kappa');

    // Basic Metadata
    expect(msg.meta.badges).toEqual({global_mod:'1',turbo:'1'});
    expect(msg.meta.color).toBe('#0D4200');
    expect(msg.meta.id).toBe('b34ccfc7-4977-403a-8a94-33c6bac34fb8');
    expect(msg.meta.mod).toBe(false);
    expect(msg.meta.subscriber).toBe(false);
    expect(msg.meta.turbo).toBe(true);
    expect(msg.meta['user-id']).toBe('1337');

    // Emotes
    expect(msg.meta.emotes[0]).toEqual({
      id: '25',
      start: 0,
      end: 4
    });
    
    expect(msg.meta.emotes[1]).toEqual({
      id: '1902',
      start: 6,
      end: 10
    });

    expect(msg.meta.emotes[2]).toEqual({
      id: '25',
      start: 12,
      end: 16
    });
  });

  it('should parse ban messages', () => {
    const msg = parse('@ban-duration=30 :tmi.twitch.tv CLEARCHAT #dallas :ronni');

    expect(msg.type).toBe('ban');
    expect(msg.username).toEqual('ronni');
    expect(msg.channel).toBe('dallas');
    expect(msg.duration).toBe('30');
  });

  it('should parse common command format', () => {
    const msg = parse('@badges=global_mod/1,turbo/1;color=#0D4200;'
      + 'display-name=dallas;emotes=;mod=0;room-id=1337;subscriber=0;'
      + 'tmi-sent-ts=1507246572675;turbo=1;user-id=1337;user-type=global_mod'
      + ' :ronni!ronni@ronni.tmi.twitch.tv PRIVMSG #dallas :!myCommand arg1 "arg two" 3');

    expect(msg.type).toBe('command');
    expect(msg.command).toEqual('myCommand');
    expect(msg.channel).toBe('dallas');
    expect(msg.arguments).toEqual(['arg1', 'arg two', 3]);
  });
});