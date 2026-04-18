/* ============================================================
   SALINHA DA TIA BEL — app.js (VERSÃO COM LOGIN)
   ============================================================ */

const TIA_BEL = './1775603881127.png';

/* These are populated from JSON at startup */
var DATA, MEM_POOL, GAMES_CONFIG, QS_PER_LEVEL;

/* ============================================================
   STATE
   ============================================================ */
var S = {
  game: null,
  level: 0,
  questions: [],
  qIdx: 0,
  score: 0,
  answering: false,
  modalSuccess: false,
  // NOVO: Nome do Aluno
  playerName: localStorage.getItem('tib_player_name') || '',
  // Memory
  memCards: [],
  memFlipped: [],
  memMatched: 0,
  memLocked: false,
  // Audio
  audioCtx: null,
  melodyOn: false,
  melodyTid: null,
  melodyIdx: 0,
  // Persistence
  totalStars: +(localStorage.getItem('tib_stars') || 0),
  gameStars:  JSON.parse(localStorage.getItem('tib_gstars') || '{}'),
};

/* ============================================================
   LÓGICA DE LOGIN (NOVA)
   ============================================================ */
function saveUserAndStart() {
  var input = document.getElementById('user-name');
  var name = input.value.trim();
  
  if (name.length >= 2) {
    sndClick();
    S.playerName = name;
    localStorage.setItem('tib_player_name', name);
    
    // Transição de tela
    document.getElementById('screen-login').classList.remove('active');
    goTo('menu');
    
    var msgBemVindo = 'Olá ' + S.playerName + '! Eu sou a Tia Bel. Vamos aprender e brincar juntos?';
    setTimeout(function() {
      speak(msgBemVindo);
    }, 500);
  } else {
    sndWrong();
    speak('Por favor, me diga qual é o seu nome!');
    input.focus();
  }
}

function confirmExit() {
  sndClick();
  speak('Quer voltar ao menu?');
  document.getElementById('modal-exit').classList.remove('hidden');
}

function doExitGame() {
  document.getElementById('modal-exit').classList.add('hidden');
  goTo('menu');
}

function closeExitModal() {
  sndClick();
  document.getElementById('modal-exit').classList.add('hidden');
}

function changeName() {
  sndClick();
  if (confirm('Trocar de jogador? O nome atual será removido.')) {
    S.playerName = '';
    localStorage.removeItem('tib_player_name');
    document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
    document.getElementById('screen-login').classList.add('active');
    var inp = document.getElementById('user-name');
    if (inp) inp.value = '';
    window.scrollTo(0, 0);
    setTimeout(function() { speak('Olá! Eu sou a Tia Bel. Qual é o seu nome?'); }, 400);
  }
}

/* Trigger bounce animation on all .btn-back clicks */
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.btn-back');
  if (!btn) return;
  btn.classList.remove('animating');
  // Force reflow so the animation restarts if clicked quickly
  void btn.offsetWidth;
  btn.classList.add('animating');
  btn.addEventListener('animationend', function h() {
    btn.classList.remove('animating');
    btn.removeEventListener('animationend', h);
  });
});

/* ============================================================
   DATA LOADING
   ============================================================ */
function loadGameData() {
  return Promise.all([
    fetch('./data/game-data.json').then(function(r) { return r.json(); }),
    fetch('./data/config.json').then(function(r) { return r.json(); }),
  ]).then(function(results) {
    var gameData = results[0];
    var config   = results[1];
    DATA         = gameData.DATA;
    MEM_POOL     = gameData.MEM_POOL;
    GAMES_CONFIG = config.GAMES_CONFIG;
    QS_PER_LEVEL = config.QS_PER_LEVEL;
  });
}

/* ============================================================
   AUDIO
   ============================================================ */
function ctx() {
  if (!S.audioCtx) S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return S.audioCtx;
}

function tone(freq, dur, type, vol, delay) {
  type  = type  || 'sine';
  vol   = vol   !== undefined ? vol   : 0.28;
  delay = delay !== undefined ? delay : 0;
  try {
    var c = ctx();
    var o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime + delay);
    g.gain.setValueAtTime(0, c.currentTime + delay);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + delay + 0.025);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + dur + 0.05);
  } catch(e) { console.error('Web Audio error:', e); }
}

function sndClick()   { tone(600, 0.07, 'square', 0.12); }
function sndCorrect() { [261.63,329.63,392,523.25].forEach(function(f,i){ tone(f,.16,'triangle',.28,i*.09); }); }
function sndWrong()   { tone(220,.22,'sawtooth',.22); tone(180,.28,'sawtooth',.18,.22); }
function sndWin() {
  var m=[523.25,523.25,523.25,659.25,523.25,659.25,783.99];
  var d=[.14,.14,.14,.38,.14,.14,.55];
  var t=0; m.forEach(function(f,i){ tone(f,d[i],'triangle',.28,t); t+=d[i]+.04; });
}

/* ──── Background melody: Ciranda Cirandinha ──── */
var MELODY = [
  [329.63,.22],[293.66,.22],[261.63,.22],[293.66,.22],
  [329.63,.22],[329.63,.22],[329.63,.38],[0,.10],
  [293.66,.22],[293.66,.22],[293.66,.38],[0,.10],
  [329.63,.22],[392.00,.22],[392.00,.38],[0,.12],
  [329.63,.22],[293.66,.22],[261.63,.22],[293.66,.22],
  [329.63,.22],[329.63,.22],[329.63,.22],[329.63,.22],
  [293.66,.22],[293.66,.22],[329.63,.22],[293.66,.22],
  [261.63,.50],[0,.32],
  [392.00,.22],[349.23,.22],[329.63,.22],[349.23,.22],
  [392.00,.22],[392.00,.22],[392.00,.38],[0,.10],
  [349.23,.22],[349.23,.22],[349.23,.38],[0,.10],
  [392.00,.22],[440.00,.22],[440.00,.38],[0,.12],
  [392.00,.22],[349.23,.22],[329.63,.22],[349.23,.22],
  [392.00,.22],[392.00,.22],[392.00,.22],[392.00,.22],
  [349.23,.22],[349.23,.22],[392.00,.22],[349.23,.22],
  [329.63,.55],[0,.45],
];

function melodyTick() {
  if (!S.melodyOn) return;
  var note = MELODY[S.melodyIdx];
  var f = note[0], d = note[1];
  if (f > 0) tone(f, d, 'triangle', 0.13);
  S.melodyIdx = (S.melodyIdx + 1) % MELODY.length;
  S.melodyTid = setTimeout(melodyTick, (d + 0.04) * 1000);
}

function toggleMusic() {
  sndClick();
  S.melodyOn = !S.melodyOn;
  if (S.melodyOn) {
    try { ctx().resume(); } catch(e) {}
    S.melodyIdx = 0;
    melodyTick();
    document.querySelectorAll('.btn-icon').forEach(function(b) { b.classList.add('on'); });
    document.getElementById('btn-music-menu').textContent = '🔊';
  } else {
    clearTimeout(S.melodyTid);
    document.querySelectorAll('.btn-icon').forEach(function(b) { b.classList.remove('on'); });
    document.getElementById('btn-music-menu').textContent = '🎵';
  }
}

/* ──── Speech Synthesis ──── */
var _voices = [];
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices && window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener && window.speechSynthesis.addEventListener('voiceschanged', function() {
    _voices = window.speechSynthesis.getVoices();
  });
}

function stripEmojisAndSymbols(text) {
  return (text || '')
    .replace(/[\p{Extended_Pictographic}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function speak(text, cb) {
  if (!window.speechSynthesis) { cb && cb(); return; }
  window.speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(text);
  u.lang   = 'pt-BR';
  u.rate   = 0.88;
  u.pitch  = 1.25;
  u.volume = 1;
  var ptV = _voices.find(function(v) { return v.lang.startsWith('pt'); });
  if (ptV) u.voice = ptV;
  if (cb) u.onend = cb;
  window.speechSynthesis.speak(u);
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function attachOptionAudio(container) {
  container.querySelectorAll('[data-nome]').forEach(function(btn) {
    var nome = btn.dataset.nome;
    btn.addEventListener('mouseenter', function() { speakOption(nome); });
    btn.addEventListener('touchstart', function() { speakOption(nome); }, { passive: true });
    btn.addEventListener('focus',      function() { speakOption(nome); });
  });
}

var _speakOptTid = null;
function speakOption(text) {
  clearTimeout(_speakOptTid);
  _speakOptTid = setTimeout(function() { speak(stripEmojisAndSymbols(text)); }, 180);
}

/* ============================================================
   UTILITIES
   ============================================================ */
function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function saveProgress() {
  localStorage.setItem('tib_stars',  S.totalStars);
  localStorage.setItem('tib_gstars', JSON.stringify(S.gameStars));
}

/* ============================================================
   SCREEN NAVIGATION
   ============================================================ */
function goTo(name) {
  sndClick();
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById('screen-' + name).classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'menu') setupMenu();
}

/* ============================================================
   MENU
   ============================================================ */
function setupMenu() {
  var grid = document.getElementById('games-grid');
  grid.innerHTML = '';
  GAMES_CONFIG.forEach(function(g) {
    var earned = S.gameStars[g.id] || 0;
    var div = document.createElement('div');
    div.className = 'game-card';
    div.innerHTML =
      '<span class="card-emoji">' + g.emoji + '</span>' +
      '<div class="card-title">'  + g.short  + '</div>' +
      '<div class="card-stars">'  + '⭐'.repeat(Math.min(earned, 9)) + '</div>';
    div.onclick = function() { selectGame(g); };
    div.addEventListener('mouseenter', function() { speakOption(g.short); });
    div.addEventListener('touchstart', function() { speakOption(g.short); }, { passive: true });
    grid.appendChild(div);
  });
  document.getElementById('total-stars-display').textContent = S.totalStars;
}

function selectGame(g) {
  sndClick();
  S.game = g;
  document.getElementById('lv-emoji').textContent = g.emoji;
  document.getElementById('lv-title').textContent = g.title;
  goTo('level');
  speak(S.playerName + ', vamos jogar ' + g.short + '! Escolha o nível.');
}

function tiaBelGreet() {
  sndClick();
  var msgs = [
    'Olá ' + S.playerName + '! Eu sou a Tia Bel! Vamos aprender juntos?',
    'Você consegue, ' + S.playerName + '! Eu acredito em você!',
    'Aprender é divertido! Vamos lá!',
    'Parabéns por estudar, ' + S.playerName + '! Continue assim!',
    'Que saudade de você! Vamos jogar?',
  ];
  speak(msgs[Math.floor(Math.random() * msgs.length)]);
}

/* ============================================================
   QUESTION GENERATION
   ============================================================ */
function genIdentify(pool, nOpts, nQ) {
  var qs = [];
  var sh = shuffle(pool.slice());
  for (var i = 0; i < nQ; i++) {
    var correct = sh[i % sh.length];
    var others  = shuffle(sh.filter(function(x) { return x !== correct; })).slice(0, nOpts - 1);
    var options = shuffle([correct].concat(others));
    qs.push({ correct: correct, options: options, ci: options.indexOf(correct) });
  }
  return qs;
}

function genSequence(level, nQ) {
  var qs = [];
  for (var i = 0; i < nQ; i++) {
    var seq, answer, opts;
    if (level === 0) {
      var s0 = Math.floor(Math.random() * 5) + 1;
      seq = [s0, s0+1, null, s0+3]; answer = s0+2;
    } else if (level === 1) {
      var s1 = Math.floor(Math.random() * 3) + 1;
      seq = [s1, s1+2, null, s1+6]; answer = s1+4;
    } else {
      var s2 = Math.floor(Math.random() * 5) + 6;
      seq = [s2, s2-1, null, s2-3]; answer = s2-2;
    }
    var decoys = shuffle([answer+1, answer-1, answer+2, answer-2]
      .filter(function(n) { return n > 0 && n !== answer; })).slice(0, 3);
    opts = shuffle([answer].concat(decoys));
    qs.push({ seq: seq, answer: answer, opts: opts });
  }
  return qs;
}

function genMemory(n) {
  var pairs = MEM_POOL.slice(0, n / 2);
  return shuffle(pairs.concat(pairs)).map(function(emoji, id) {
    return { id: id, emoji: emoji, flipped: false, matched: false };
  });
}

/* ============================================================
   GAME START
   ============================================================ */
function startGame(lvl) {
  sndClick();
  S.level     = lvl;
  S.qIdx      = 0;
  S.score     = 0;
  S.answering = false;
  var g   = S.game;
  var nOp = g.sizes[lvl];
  var nQ  = QS_PER_LEVEL[lvl];

  if (g.type === 'colors') {
    S.questions = genIdentify(DATA.cores, nOp, nQ);
  } else if (g.type === 'letters') {
    var pool = lvl === 0 ? DATA.letras.slice(0, 10) : lvl === 1 ? DATA.letras.slice(0, 18) : DATA.letras;
    S.questions = genIdentify(pool, nOp, nQ);
  } else if (g.type === 'emoji') {
    S.questions = genIdentify(DATA[g.key], nOp, nQ);
  } else if (g.type === 'sequence') {
    S.questions = genSequence(lvl, nQ);
  } else if (g.type === 'memory') {
    S.memCards   = genMemory(nOp);
    S.memFlipped = [];
    S.memMatched = 0;
    S.memLocked  = false;
  }

  document.getElementById('game-label').textContent =
    g.emoji + ' ' + g.short + ' · ' + ['⭐ Fácil','⭐⭐ Médio','⭐⭐⭐ Difícil'][lvl];
  document.getElementById('score-badge').textContent = '⭐ 0';

  goTo('game');

  if (g.type === 'memory') renderMemory();
  else renderQuestion();
}

function setProgress(val) {
  document.getElementById('progress-bar').style.width = val + '%';
}

/* ============================================================
   RENDER QUESTION
   ============================================================ */
function renderQuestion() {
  setProgress((S.qIdx / S.questions.length) * 100);
  var g = S.game, q = S.questions[S.qIdx];
  var C = document.getElementById('game-container');

  if (g.type === 'sequence') { renderSeq(q, C); return; }

  var promptInner = '';
  if (g.type === 'colors') {
    promptInner = 'Clique na cor <strong>' + q.correct.nome + '</strong> 🔊';
  } else if (g.type === 'letters') {
    promptInner = 'Encontre a letra <strong style="font-size:1.3em">' + q.correct.nome + '</strong> 🔊';
  } else {
    var verb = g.id === 'numeros' ? 'Clique no número' : 'Encontre';
    promptInner = verb + ' <strong>' + q.correct.nome + '</strong> 🔊';
  }

  var palette = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#fd79a8'];
  var optBtns = q.options.map(function(opt, i) {
    var nomeAttr = ' data-nome="' + escHtml(opt.nome) + '"';
    if (g.type === 'colors') {
      return '<button class="option-btn" style="background:' + opt.cor + ';color:' + opt.text + ';border:3px solid rgba(0,0,0,.08)"' +
             ' data-i="' + i + '" onclick="checkAnswer(' + i + ')"' + nomeAttr + '>' + escHtml(opt.nome) + '</button>';
    }
    if (g.type === 'letters') {
      var col = palette[i % palette.length];
      return '<button class="option-btn" style="background:' + col + ';color:#fff;font-size:2.2rem"' +
             ' data-i="' + i + '" onclick="checkAnswer(' + i + ')"' + nomeAttr + '>' + escHtml(opt.emoji) + '</button>';
    }
    var col2 = palette[i % palette.length];
    return '<button class="option-btn" style="background:' + col2 + ';color:#fff"' +
           ' data-i="' + i + '" onclick="checkAnswer(' + i + ')"' + nomeAttr + '>' +
           '<span style="font-size:2rem">' + escHtml(opt.emoji) + '</span>' +
           '<span>' + escHtml(opt.nome) + '</span>' +
           '</button>';
  }).join('');

  var extraCls = q.options.length > 4 ? ' cols-3' : '';

  C.innerHTML =
    '<div class="q-counter">Pergunta ' + (S.qIdx+1) + ' de ' + S.questions.length + '</div>' +
    '<div class="question-card" onclick="readPrompt()">' +
      '<div class="question-prompt">' + promptInner + '</div>' +
    '</div>' +
    '<div class="options-grid' + extraCls + '">' + optBtns + '</div>';

  attachOptionAudio(C);
  setTimeout(function() { speak('Clique em ' + q.correct.nome); }, 350);
}

function readPrompt() {
  sndClick();
  var q = S.questions[S.qIdx];
  speak('Clique em ' + (q.correct ? q.correct.nome : 'Qual número falta?'));
}

function renderSeq(q, C) {
  var seqHtml = q.seq.map(function(n) {
    return n !== null
      ? '<div class="seq-box">' + n + '</div>'
      : '<div class="seq-box blank">?</div>';
  }).join('<span class="seq-arrow">→</span>');

  var palette = ['#e74c3c','#3498db','#2ecc71','#f39c12'];
  var optBtns = q.opts.map(function(n, i) {
    return '<button class="option-btn" style="background:' + palette[i] + ';color:#fff;font-size:2rem"' +
           ' data-i="' + i + '" onclick="checkSeq(' + n + ',' + i + ')">' + n + '</button>';
  }).join('');

  C.innerHTML =
    '<div class="q-counter">Pergunta ' + (S.qIdx+1) + ' de ' + S.questions.length + '</div>' +
    '<div class="question-card" onclick="speak(\'Qual número falta na sequência?\')">' +
      '<div class="question-prompt">Qual número falta? 🔊</div>' +
    '</div>' +
    '<div class="sequence-row">' + seqHtml + '</div>' +
    '<div class="options-grid">' + optBtns + '</div>';

  setTimeout(function() { speak('Qual número falta na sequência?'); }, 350);
}

function renderMemory() {
  var n    = S.memCards.length;
  var cols = 4;
  setProgress(0);

  document.getElementById('game-container').innerHTML =
    '<div class="mem-info">' +
      '🎯 Encontre os pares! Pares: <span id="mem-found">0</span>/' + (n/2) +
    '</div>' +
    '<div class="memory-grid" style="grid-template-columns:repeat(' + cols + ',1fr)">' +
      S.memCards.map(function(c, i) {
        return '<button class="mem-card" id="mc-' + i + '" onclick="flipMem(' + i + ')">' +
               '<span class="mem-back">⭐</span>' +
               '<span class="mem-front">' + c.emoji + '</span>' +
               '</button>';
      }).join('') +
    '</div>';

  setTimeout(function() { speak(S.playerName + ', encontre os pares iguais! Boa sorte!'); }, 350);
}

/* ============================================================
   ANSWER CHECKING
   ============================================================ */
function checkAnswer(i) {
  if (S.answering) return;
  S.answering = true;
  sndClick();
  var q    = S.questions[S.qIdx];
  var btns = document.querySelectorAll('.option-btn');
  btns.forEach(function(b) { b.disabled = true; });

  var ok = i === q.ci;
  btns[i].classList.add(ok ? 'correct' : 'wrong');
  if (!ok) btns[q.ci].classList.add('correct');

  if (ok) { S.score++; sndCorrect(); document.getElementById('score-badge').textContent = '⭐ ' + S.score; }
  else    { sndWrong(); }

  setTimeout(function() { showModal(ok); }, ok ? 580 : 720);
}

function checkSeq(val, i) {
  if (S.answering) return;
  S.answering = true;
  sndClick();
  var q    = S.questions[S.qIdx];
  var btns = document.querySelectorAll('.option-btn');
  btns.forEach(function(b) { b.disabled = true; });

  var ok = val === q.answer;
  btns[i].classList.add(ok ? 'correct' : 'wrong');
  if (!ok) {
    var cb = Array.from(btns).find(function(b) { return +b.textContent.trim() === q.answer; });
    if (cb) cb.classList.add('correct');
  }
  if (ok) { S.score++; sndCorrect(); document.getElementById('score-badge').textContent = '⭐ ' + S.score; }
  else    { sndWrong(); }

  setTimeout(function() { showModal(ok); }, ok ? 580 : 720);
}

function flipMem(i) {
  if (S.memLocked) return;
  var c = S.memCards[i];
  if (c.flipped || c.matched) return;
  sndClick();
  c.flipped = true;
  document.getElementById('mc-' + i).classList.add('flipped');
  S.memFlipped.push(i);

  if (S.memFlipped.length === 2) {
    S.memLocked = true;
    var a = S.memFlipped[0], b = S.memFlipped[1];
    if (S.memCards[a].emoji === S.memCards[b].emoji) {
      S.memCards[a].matched = S.memCards[b].matched = true;
      document.getElementById('mc-' + a).classList.add('matched');
      document.getElementById('mc-' + b).classList.add('matched');
      S.memMatched++;
      S.memFlipped = [];
      S.score++;
      var total = S.memCards.length / 2;
      document.getElementById('mem-found').textContent = S.memMatched;
      setProgress(S.memMatched / total * 100);
      document.getElementById('score-badge').textContent = '⭐ ' + S.score;
      sndCorrect();

      if (S.memMatched === total) {
        S.memLocked = false;
        setTimeout(showLevelComplete, 500);
      } else {
        S.memLocked = false;
        showModal(true);
      }
    } else {
      sndWrong();
      setTimeout(function() {
        S.memCards[a].flipped = S.memCards[b].flipped = false;
        document.getElementById('mc-' + a).classList.remove('flipped');
        document.getElementById('mc-' + b).classList.remove('flipped');
        S.memFlipped = [];
        S.memLocked  = false;
        showModal(false);
      }, 900);
    }
  }
}

/* ============================================================
   MODAL
   ============================================================ */
function showModal(ok) {
  var title = document.getElementById('modal-title');
  var msg   = document.getElementById('modal-msg');
  var emj   = document.getElementById('modal-emojis');
  var btn   = document.getElementById('modal-btn');

  S.modalSuccess = ok;

  if (ok) {
    title.textContent = 'Parabéns! 🎉';
    title.className   = 'modal-title success';
    var m = rnd([
      'Muito bem, ' + S.playerName + '! Você acertou!',
      'Incrível, ' + S.playerName + '! Você é muito inteligente!',
      'Parabéns, ' + S.playerName + '! Continue assim!',
      'Ótimo, ' + S.playerName + '! Você está indo muito bem!',
      'Uau, ' + S.playerName + '! Que resposta incrível!',
      'Isso mesmo, ' + S.playerName + '! A Tia Bel ficou super orgulhosa de você!',
    ]);
    msg.textContent   = m;
    emj.textContent   = '🌟🎉⭐';
    btn.textContent   = 'Continuar ▶';
    spawnConfetti();
    speak(stripEmojisAndSymbols(m));
  } else {
    title.textContent = 'Vamos tentar! 💪';
    title.className   = 'modal-title failure';
    var mf = rnd([
      'Quase lá, ' + S.playerName + '! Vamos tentar mais uma vez?',
      'Não desista, ' + S.playerName + '! Você consegue!',
      'Vamos lá, ' + S.playerName + '! Na próxima você acerta!',
      'Boa tentativa, ' + S.playerName + '! Tente de novo, você é capaz!',
      'Não tem problema, ' + S.playerName + '! Aprender é isso mesmo!',
    ]);
    msg.textContent   = mf;
    emj.textContent   = '💪🌈💙';
    btn.textContent   = S.game.type === 'memory' ? 'Continuar ▶' : 'Tentar de Novo ↩';
    speak(stripEmojisAndSymbols(mf));
  }

  document.getElementById('modal').classList.remove('hidden');
}

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  var g = S.game;
  if (g.type === 'memory') return;
  S.answering = false;
  if (S.modalSuccess) {
    S.qIdx++;
    if (S.qIdx >= S.questions.length) showLevelComplete();
    else renderQuestion();
  } else {
    renderQuestion();
  }
}

/* ============================================================
   LEVEL COMPLETE
   ============================================================ */
function showLevelComplete() {
  document.getElementById('modal').classList.add('hidden');
  var g     = S.game;
  var total = g.type === 'memory' ? S.memCards.length / 2 : S.questions.length;
  var pct   = S.score / total;

  var stars = 1;
  if (pct >= 0.7) stars = 2;
  if (pct >= 0.9) stars = 3;

  var prev   = S.gameStars[g.id] || 0;
  var earned = S.level * 3 + stars;
  if (earned > prev) {
    S.totalStars += (earned - prev);
    S.gameStars[g.id] = earned;
    saveProgress();
  }

  var great = pct >= 0.7;
  document.getElementById('res-trophy').textContent = pct >= 0.9 ? '🏆' : great ? '😊' : '💪';
  document.getElementById('res-title').textContent  = pct >= 0.9 ? 'Você é incrível!' : great ? 'Muito bem!' : 'Continue tentando!';
  document.getElementById('res-score').textContent  = S.score + '/' + total;
  document.getElementById('res-stars').textContent  = '⭐'.repeat(stars);
  document.getElementById('res-msg').textContent    = 'Você ganhou ' + stars + ' estrela' + (stars > 1 ? 's' : '') + '!';

  var nxtBtn = document.getElementById('btn-next-lv');
  nxtBtn.style.display = S.level < 2 ? '' : 'none';

  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  document.getElementById('screen-results').classList.add('active');
  window.scrollTo(0, 0);

  if (great) {
    sndWin();
    spawnConfetti();
    speak('Parabéns ' + S.playerName + '! Você completou o nível e ganhou ' + stars + ' estrela' + (stars > 1 ? 's' : '') + '!');
  } else {
    speak('Boa tentativa, ' + S.playerName + '! Continue praticando!');
  }
}

function nextLevel() {
  sndClick();
  if (S.level < 2) startGame(S.level + 1);
}

/* ============================================================
   CONFETTI
   ============================================================ */
function spawnConfetti() {
  var box = document.getElementById('confetti');
  box.innerHTML = '';
  var items = ['⭐','🌟','🎉','🎊','✨','💫','🌈','❤️','🏆'];
  for (var i = 0; i < 22; i++) {
    var el = document.createElement('div');
    el.className   = 'confetti-piece';
    el.textContent = rnd(items);
    el.style.left             = Math.random() * 100 + 'vw';
    el.style.fontSize         = (1.1 + Math.random() * 1.4) + 'rem';
    el.style.animationDuration = (1.6 + Math.random() * 2) + 's';
    el.style.animationDelay   = Math.random() * 0.5 + 's';
    box.appendChild(el);
  }
  setTimeout(function() { box.innerHTML = ''; }, 3500);
}

/* ============================================================
   INIT
   ============================================================ */
window.addEventListener('load', function() {
  _voices = (window.speechSynthesis && window.speechSynthesis.getVoices()) || [];

  loadGameData().then(function() {
    ['img-tia-bel-login', 'img-tia-bel-menu', 'img-tia-bel-modal'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.src = TIA_BEL;
    });

    if (!window.speechSynthesis) {
      var note = document.createElement('div');
      note.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;padding:6px 14px;border-radius:20px;font-size:.85rem;z-index:9999;pointer-events:none';
      note.textContent = '🔇 Áudio de voz não disponível';
      document.body.appendChild(note);
      setTimeout(function() { note.remove(); }, 5000);
    }

    setupMenu();

    // Lógica para pular login se já existir nome
    if (S.playerName) {
      document.getElementById('screen-login').classList.remove('active');
      document.getElementById('screen-menu').classList.add('active');
      var msgVolta = 'Bem-vindo de volta, ' + S.playerName + '! Vamos jogar?';
      setTimeout(function() {
        speak(msgVolta);
      }, 900);
    } else {
      setTimeout(function() { speak('Olá! Eu sou a Tia Bel. Qual é o seu nome?'); }, 600);
    }

  }).catch(function(err) {
    console.error('Erro ao carregar dados:', err);
  });
});

document.addEventListener('click', function() {
  if (S.audioCtx && S.audioCtx.state === 'suspended') S.audioCtx.resume();
}, { once: true });
