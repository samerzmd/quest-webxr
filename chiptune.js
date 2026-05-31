// chiptune.js — procedural demoscene / crack-intro style chiptune engine.
// All music is generated live in the browser via the Web Audio API. These are
// ORIGINAL compositions written in the classic tracker / crack-intro style
// (fast arpeggios, square-wave bass, noise drums). No copyrighted audio is used
// or reproduced.
//
// Usage:
//   import { makeChiptune } from './chiptune.js';
//   const music = makeChiptune(audioContext);   // share the game's AudioContext
//   music.play('blaster');                       // start a track (loops)
//   music.toggleMute();                          // or press the M key / mute button
//   music.stop();

function makeChiptune(ctx, opts){
  opts = opts || {};
  const master = ctx.createGain();
  master.gain.value = 0.30;
  master.connect(ctx.destination);
  let muted = false;

  // shared noise buffer for percussion
  const nb = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
  const nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const base = 110; // A2
  const hz = s => base * Math.pow(2, s / 12);

  function osc(t, f, dur, type, vol, slideTo){
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, hp, dur, vol){
    const s = ctx.createBufferSource(); s.buffer = nb;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(t){
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
    g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.16);
  }
  function snare(t){ noise(t, 1500, 0.16, 0.28); osc(t, 200, 0.05, 'triangle', 0.1); }
  function hat(t, v){ noise(t, 9000, 0.04, v); }

  // chord builders (semitone offsets from base)
  const maj = r => [r, r + 4, r + 7];
  const min = r => [r, r + 3, r + 7];

  // ---- TRACK POOL ----
  // 13 original high-energy chiptune / tracker-style tunes, written in the spirit of
  // demoscene crack-intro music (Dubmood / Ziphoid / MASTER BOOT RECORD vibe). Every note
  // is synthesized live — no sampled or copyrighted music. The engine shuffles through
  // these randomly, switching to a new random tune every few loops.
  const POOL = [
    { bpm:128, prog:[min(0),  maj(7),  min(9),  maj(5)],  drums:0, arp:0 },
    { bpm:132, prog:[min(0),  maj(8),  min(5),  maj(7)],  drums:0, arp:0 },
    { bpm:142, prog:[min(0),  min(-2), maj(3),  min(0)],  drums:2, arp:1 },
    { bpm:150, prog:[min(0),  maj(5),  min(-1), maj(3)],  drums:2, arp:2 },
    { bpm:118, prog:[maj(0),  maj(5),  maj(7),  maj(2)],  drums:1, arp:0 },
    { bpm:138, prog:[min(0),  min(5),  maj(8),  maj(3)],  drums:0, arp:3 },
    { bpm:162, prog:[min(0),  min(3),  min(-2), maj(5)],  drums:2, arp:2 },
    { bpm:136, prog:[maj(0),  maj(7),  maj(5),  maj(2)],  drums:1, arp:1 },
    { bpm:124, prog:[min(0),  maj(3),  min(7),  maj(10)], drums:3, arp:0 },
    { bpm:148, prog:[min(0),  maj(8),  maj(3),  min(5)],  drums:2, arp:3 },
    { bpm:120, prog:[maj(0),  min(9),  maj(5),  maj(7)],  drums:1, arp:2 },
    { bpm:156, prog:[min(0),  min(7),  maj(10), maj(5)],  drums:2, arp:1 },
    { bpm:134, prog:[maj(0),  maj(2),  maj(7),  maj(5)],  drums:0, arp:0 },
  ];

  // 16-step drum patterns (kick / snare) — variety of grooves
  const DRUMS = [
    { k:[1,0,0,0,1,0,0,1,1,0,0,0,1,0,0,0], s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] }, // crack-intro
    { k:[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0], s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] }, // syncopated
    { k:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0], s:[0,0,0,0,1,0,0,1,0,0,0,0,1,0,0,1] }, // driving / gabber-lite
    { k:[1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0], s:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0] }, // sparse
  ];

  // arpeggio styles over a chord triad [root, 3rd, 5th]
  function arpTones(c, mode){
    switch (mode){
      case 1: return [c[2], c[1], c[0], c[1]];                          // descending roll
      case 2: return [c[0], c[0] + 12, c[1], c[2]];                     // wide / octave jump
      case 3: return [c[0], c[1], c[2], c[1], c[2], c[0] + 12, c[2], c[1]]; // busy 8-step
      default: return [c[0], c[1], c[2], c[0] + 12];                    // classic up
    }
  }

  let timer = null, cur = null, track = null, trackIdx = -1, patStep = 0, nextTime = 0, stepDur = 0, loopsLeft = 0;
  const LOOKAHEAD = 0.12, INTERVAL = 25;

  function pickTrack(){
    let i; do { i = Math.floor(Math.random() * POOL.length); } while (POOL.length > 1 && i === trackIdx);
    trackIdx = i; track = POOL[i]; cur = track;
    stepDur = (60 / track.bpm) / 4;       // sixteenth notes
    patStep = 0;
    loopsLeft = 2 + Math.floor(Math.random() * 3); // play this tune 2-4 loops, then shuffle
  }

  function scheduleStep(t){
    const prog = track.prog, D = DRUMS[track.drums];
    const s = patStep % 16;
    const loopLen = 16 * prog.length;
    const chord = prog[Math.floor(patStep / 16) % prog.length];
    if (D.k[s]) kick(t);
    if (D.s[s]) snare(t);
    hat(t, (s % 2) ? 0.04 : 0.022);
    if (s % 4 === 0) osc(t, hz(chord[0] - 12), stepDur * 3.6, 'triangle', 0.22);
    const tones = arpTones(chord, track.arp);
    osc(t, hz(tones[patStep % tones.length] + 12), stepDur * 0.9, 'square', 0.12);
    if (s % 8 === 0) osc(t, hz(chord[0] + 24), stepDur * 1.5, 'square', 0.07);
    patStep++;
    if (patStep % loopLen === 0){ loopsLeft--; if (loopsLeft <= 0) pickTrack(); }
  }

  function tick(){
    if (!cur) return;
    while (nextTime < ctx.currentTime + LOOKAHEAD){ scheduleStep(nextTime); nextTime += stepDur; }
  }

  function play(){
    pickTrack();
    nextTime = ctx.currentTime + 0.08;
    if (ctx.state === 'suspended') ctx.resume();
    if (!timer) timer = setInterval(tick, INTERVAL);
  }
  function ensure(){ if (!cur) play(); }   // start only if nothing is playing (seamless across screens)
  function stop(){ cur = null; if (timer){ clearInterval(timer); timer = null; } }
  function setMute(b){ muted = b; master.gain.value = b ? 0 : 0.30; if (btn) btn.textContent = b ? '🔇 MUSIC' : '🔊 MUSIC';
    if (typeof window !== 'undefined') window.__arcadeMuted = b; }
  function toggleMute(){ setMute(!muted); }

  // floating mute button + M-key shortcut
  let btn = null;
  if (opts.button !== false && typeof document !== 'undefined'){
    btn = document.createElement('div');
    btn.textContent = '🔊 MUSIC';
    btn.style.cssText = 'position:fixed;top:16px;right:16px;z-index:30;color:#cdd6ff;cursor:pointer;' +
      'font-family:"Trebuchet MS",sans-serif;font-weight:900;letter-spacing:1px;font-size:14px;' +
      'background:rgba(13,18,40,.7);border:2px solid #2d6cff;border-radius:10px;padding:8px 14px;user-select:none;';
    // stop the press from reaching the game's window-level shoot/throw handlers
    btn.addEventListener('mousedown', e => e.stopPropagation());
    btn.addEventListener('click', e => { e.stopPropagation(); toggleMute(); });
    const add = () => { if (!document.body.contains(btn)) document.body.appendChild(btn); };
    if (document.body) add(); else addEventListener('DOMContentLoaded', add);
    addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm') toggleMute(); });
  }

  return { play, ensure, stop, setMute, toggleMute, get current(){ return cur; } };
}

// Exposed as a global so games can load this with a classic <script src="chiptune.js">
// tag — classic scripts load from file:// (double-click), unlike ES-module imports.
if (typeof window !== 'undefined') window.makeChiptune = makeChiptune;

/* ===================== VOICE HYPE ===================== */
// Spoken motivational callouts via the browser's built-in speech synthesis (no audio
// files). Throttled so it celebrates without talking over itself, and silenced by the
// same mute button as the music. Call cheer('hit' | 'great' | 'big').
(function(){
  if (typeof window === 'undefined') return;
  const POOLS = {
    hit:   { en:['Nice!', 'Got it!', 'Boom!', 'Yes!', 'Sweet!', 'Bam!', 'Hit!'],
             ja:['ナイス！', 'よし！', 'いいぞ！', 'きた！'] },
    great: { en:['Excellent!', 'Great shot!', 'Awesome!', 'Well done!', 'Crushing it!', 'So good!'],
             ja:['すごい！', '最高！', 'いいね！', 'ナイスショット！', 'お見事！'] },
    big:   { en:['Killing it!', 'Unstoppable!', 'Incredible!', "You're on fire!", 'You got this!',
                 'Amazing!', 'Combo!', 'Legendary!', 'Off the charts!'],
             ja:['やったー！', '完璧だ！', '信じられない！', '素晴らしい！', 'ゴール！', '神ってる！'] }
  };
  const CFG = { hit:{p:0.30, gap:2200}, great:{p:0.65, gap:1700}, big:{p:1.0, gap:1100} };
  let last = 0;

  // ---- OPTIONAL EMBEDDED VOICE CLIPS ----
  // Drop audio files into a ./voices/ folder and they're used automatically instead of
  // the browser's text-to-speech. Expected names (any of each kind, picked at random):
  //   voices/hit1.mp3 hit2.mp3 hit3.mp3 | great1.mp3 great2.mp3 great3.mp3 | big1.mp3 ... big4.mp3
  // (.ogg/.wav also fine — just change the extension below.) If the folder is missing,
  // it silently falls back to the spoken TTS voice.
  const VOICE_DIR = 'voices/', VOICE_EXT = '.mp3';
  const VOICE_FILES = { hit:['hit1','hit2','hit3'], great:['great1','great2','great3'], big:['big1','big2','big3','big4'] };
  let voiceFilesOK = false;
  if (typeof Audio !== 'undefined'){
    try {
      const probe = new Audio(VOICE_DIR + 'big1' + VOICE_EXT);
      probe.addEventListener('canplaythrough', () => { voiceFilesOK = true; }, { once:true });
      probe.addEventListener('error', () => { voiceFilesOK = false; }, { once:true });
      probe.load();
    } catch(e){}
  }
  function playClip(kind){
    const names = VOICE_FILES[kind] || VOICE_FILES.hit;
    const a = new Audio(VOICE_DIR + names[Math.floor(Math.random() * names.length)] + VOICE_EXT);
    a.volume = 1.0; const p = a.play(); if (p && p.catch) p.catch(()=>{});
  }

  // ---- FULLY-EMBEDDED CLIPS (base64) ----
  // Run build_voices.py to bake ./voices/*.mp3 into voices.js as data URIs. We load it
  // automatically here so no <script> tag edits are needed in the game pages.
  if (typeof document !== 'undefined'){
    try { const s = document.createElement('script'); s.src = 'voices.js'; s.onerror = ()=>{}; (document.head||document.documentElement).appendChild(s); } catch(e){}
  }
  function playEmbedded(kind){
    const map = window.__voiceClips; const arr = (map && (map[kind] || map.hit)) || [];
    if (!arr.length) throw 0;
    const a = new Audio(arr[Math.floor(Math.random() * arr.length)]);
    a.volume = 1.0; const p = a.play(); if (p && p.catch) p.catch(()=>{});
  }
  function hasEmbedded(kind){ const m = window.__voiceClips; return !!(m && ((m[kind] && m[kind].length) || (m.hit && m.hit.length))); }

  // pick a deep / "manly" announcer voice (Candy-Crush-style voice-over)
  let voice = null, jaVoice = null;
  function pickVoice(){
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    if (!vs.length) return;
    const prefer = ['Google UK English Male', 'Microsoft David - English (United States)',
      'Microsoft David Desktop', 'Microsoft David', 'Microsoft Mark', 'Microsoft Guy Online',
      'Daniel', 'Alex', 'Fred', 'Microsoft George', 'Rishi', 'Aaron', 'Arthur'];
    voice = prefer.map(n => vs.find(v => v.name === n)).find(Boolean)
         || vs.find(v => /\bmale\b/i.test(v.name) && !/female/i.test(v.name))
         || vs.find(v => /\b(david|mark|guy|daniel|alex|fred|george|james|paul|tom|arthur|rishi|aaron)\b/i.test(v.name))
         || vs.find(v => /en[-_]/i.test(v.lang))
         || vs[0];
    // Japanese voice (prefer male Otoya/Ichiro), used only when speaking JP phrases
    const jaPrefer = ['Otoya', 'Microsoft Ichiro', 'Microsoft Ichiro - Japanese (Japan)', 'Hattori', 'Google 日本語', 'Kyoko', 'O-ren'];
    jaVoice = jaPrefer.map(n => vs.find(v => v.name === n)).find(Boolean)
           || vs.find(v => /^ja/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis){ pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch(e){} }
  window.cheer = function(kind){
    kind = kind || 'hit';
    if (window.__arcadeMuted) return;
    const cfg = CFG[kind] || CFG.hit;
    const now = (performance && performance.now) ? performance.now() : Date.now();
    if (now - last < cfg.gap) return;
    if (Math.random() > cfg.p) return;
    last = now;
    if (hasEmbedded(kind)){ try { playEmbedded(kind); return; } catch(e){} }  // 1) base64 clips (voices.js)
    if (voiceFilesOK){ try { playClip(kind); return; } catch(e){} }           // 2) files in ./voices/
    if (!('speechSynthesis' in window)) return;                               // 3) spoken TTS fallback
    if (!voice) pickVoice();
    const grp = POOLS[kind] || POOLS.hit;
    const useJa = jaVoice && Math.random() < 0.45;       // slide Japanese in ~45% of the time when a JP voice exists
    const arr = useJa ? grp.ja : grp.en;
    const text = arr[Math.floor(Math.random() * arr.length)];
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (useJa) { u.voice = jaVoice; u.lang = 'ja-JP'; u.rate = 1.5; u.pitch = 1.25; }   // extra-hyped JP commentary
      else { if (voice) { u.voice = voice; u.lang = voice.lang || 'en-US'; } u.rate = 1.35; u.pitch = 1.15; }
      u.volume = 1.0;  // Jon Kabira: bright, fast, hyped commentator
      speechSynthesis.speak(u);
    } catch (e) {}
  };
})();
