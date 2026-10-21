'use strict';

// Audio settings
const AUDIO_SOURCE = 'assets/invitation-v17.m4a';
const AUDIO_START_SECONDS = 0;
const AUDIO_END_SECONDS = 58.4;
const DURATION = 58.5;

const stage = document.getElementById('invitation');
const openButton = document.getElementById('open');
const controls = document.querySelector('.invite-controls');
const pauseButton = document.getElementById('pause');
const soundButton = document.getElementById('sound');
const audio = document.getElementById('music');
const scenes = [...document.querySelectorAll('.invite-scene')];

const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

let running = false;
let started = 0;
let elapsed = 0;
let frame = 0;
let activeScene = '';
let animations = [];

const ease = 'cubic-bezier(.22,1,.36,1)';

function animate(target, keyframes, start, duration, options = {}) {
  const el = typeof target === 'string'
    ? document.querySelector(target)
    : target;

  if (!el) return;

  const animation = el.animate(keyframes, {
    duration: duration * 1000,
    delay: start * 1000,
    easing: ease,
    fill: 'both',
    ...options
  });

  animation.pause();
  animation.currentTime = 0;
  animations.push(animation);
}

function revealScene(selector, start, end, persist = false) {
  const el = document.querySelector(selector);
  const duration = end - start;

  animate(el, [
    { opacity: 1, visibility: 'visible', offset: 0 },
    { opacity: 1, visibility: 'visible', offset: 1 }
  ], start, duration, {
    easing: 'linear',
    fill: 'none'
  });

  if (persist) {
    animate(el, [
      { opacity: 1, visibility: 'visible' },
      { opacity: 1, visibility: 'visible' }
    ], start, duration, {
      easing: 'linear'
    });
  }

  [...el.querySelectorAll('.invite-line')].forEach((line, i) => {
    animate(line, [
      { opacity: 0, transform: 'translateY(8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], start + .15 + i * .65, .6);
  });
}

function buildTimeline() {
  animations.forEach(a => a.cancel());
  animations = [];

  for (const [selector, transform, delay, duration] of [
    ['.invite-panel-left', 'rotateY(-112deg)', .1, 2.1],
    ['.invite-panel-right', 'rotateY(112deg)', .18, 2.1],
    ['.invite-panel-top', 'rotateX(112deg)', .4, 2.55],
    ['.invite-panel-bottom', 'rotateX(-112deg)', .48, 2.55]
  ]) {
    animate(selector, [
      { transform: 'rotateX(0deg) rotateY(0deg)' },
      { transform }
    ], delay, duration, {
      easing: 'cubic-bezier(.4,0,.2,1)'
    });
  }

  animate('.invite-cover-glint', [
    { opacity: 0, transform: 'translateX(-50%)' },
    { opacity: .5, offset: .3 },
    { opacity: 0, transform: 'translateX(70%)' }
  ], 0, 1.7);

  animate('.invite-art', [
    { transform: 'scale(1.04)' },
    { transform: 'scale(1)' }
  ], 1, 8);

  revealScene('.invite-intro', 3, 11);
  revealScene('.invite-verse', 11, 17.5);
  revealScene('.invite-story', 17.5, 28);
  revealScene('.invite-family', 28, 38);
  revealScene('.invite-details', 38, 47);
  revealScene('.invite-closing', 47, DURATION, true);

  [...document.querySelectorAll('.invite-leaves i')].forEach((leaf, i) => {
    leaf.style.left = (7 + (i * 23) % 86) + '%';

    animate(leaf, [
      {
        opacity: 0,
        transform: `translate(0,0) rotate(${i * 29}deg)`,
        offset: 0
      },
      { opacity: .65, offset: .1 },
      { opacity: .5, offset: .8 },
      {
        opacity: 0,
        transform: `translate(${i % 2 ? '-' : ''}65px,100cqh) rotate(${i * 29 + 300}deg)`,
        offset: 1
      }
    ], 3 + i * .7, 8 + i * .26, {
      easing: 'linear',
      iterations: 7
    });
  });

  [...document.querySelectorAll('.invite-water i')].forEach((ripple, i) => {
    animate(ripple, [
      { opacity: 0, transform: 'scale(.6)' },
      { opacity: .55, offset: .3 },
      { opacity: 0, transform: 'scale(1.5)' }
    ], 3 + i * .8, 3.2, {
      easing: 'linear',
      iterations: 18
    });
  });

  [...document.querySelectorAll('.invite-sparkles i')].forEach((dot, i) => {
    animate(dot, [
      { opacity: 0, transform: 'scale(.3)' },
      { opacity: .9, transform: 'scale(1)', offset: .4 },
      { opacity: 0, transform: 'scale(.4)' }
    ], .5 + i * .47, 3.8 + i * .15, {
      easing: 'ease-in-out',
      iterations: 15
    });
  });
}

function updateScene() {
  const current = scenes.find(el =>
    elapsed >= Number(el.dataset.from) &&
    elapsed < Number(el.dataset.to)
  );

  const key = current?.className || '';

  if (key === activeScene) return;

  activeScene = key;

  scenes.forEach(el => {
    el.setAttribute('aria-hidden', String(el !== current));
  });
}

// Stop the audio before its final second.
function stopAudioAtEnd() {
  if (audio.currentTime >= AUDIO_END_SECONDS && !audio.paused) {
    audio.pause();
  }
}

audio.addEventListener('timeupdate', stopAudioAtEnd);

function finish() {
  running = false;
  cancelAnimationFrame(frame);
  elapsed = DURATION;

  animations.forEach(a => {
    a.pause();
    a.currentTime = DURATION * 1000;
  });

  updateScene();
  stage.dataset.phase = 'finished';
  pauseButton.hidden = true;
}

function tick(now) {
  if (!running) return;

  elapsed = Math.min(DURATION, (now - started) / 1000);

  updateScene();
  stopAudioAtEnd();

  if (elapsed >= DURATION) {
    finish();
    return;
  }

  frame = requestAnimationFrame(tick);
}

function playAudio() {
  if (!AUDIO_SOURCE || audio.currentTime >= AUDIO_END_SECONDS) {
    return;
  }

  audio.play().catch(() => {
    const note = document.getElementById('audio-note');
    note.textContent = 'Tap the sound button to play the music';
    note.hidden = false;
  });
}

function resumeAnimations() {
  const clock = document.timeline?.currentTime;

  animations.forEach(a => {
    a.currentTime = elapsed * 1000;
    a.play();

    if (clock !== null && clock !== undefined) {
      a.startTime = clock - elapsed * 1000;
    }
  });
}

function start() {
  cancelAnimationFrame(frame);
  elapsed = 0;
  activeScene = '';

  buildTimeline();

  stage.dataset.phase = 'playing';
  openButton.hidden = true;
  controls.hidden = false;
  pauseButton.hidden = false;

  pauseButton.textContent = 'Pause';
  pauseButton.setAttribute('aria-label', 'Pause the invitation');

  if (reducedMotion) {
    finish();
    return;
  }

  running = true;
  started = performance.now();

  resumeAnimations();

  if (AUDIO_SOURCE) {
    audio.currentTime = AUDIO_START_SECONDS;
    playAudio();
  }

  frame = requestAnimationFrame(tick);
}

openButton.addEventListener('click', start);
document.getElementById('replay').addEventListener('click', start);

pauseButton.addEventListener('click', () => {
  if (running) {
    elapsed = Math.min(
      DURATION,
      (performance.now() - started) / 1000
    );

    running = false;
    cancelAnimationFrame(frame);

    animations.forEach(a => a.pause());
    audio.pause();

    pauseButton.textContent = 'Resume';
    pauseButton.setAttribute('aria-label', 'Resume the invitation');
  } else if (elapsed < DURATION) {
    running = true;
    started = performance.now() - elapsed * 1000;

    resumeAnimations();
    playAudio();

    pauseButton.textContent = 'Pause';
    pauseButton.setAttribute('aria-label', 'Pause the invitation');

    frame = requestAnimationFrame(tick);
  }
});

if (AUDIO_SOURCE) {
  audio.src = AUDIO_SOURCE;
  soundButton.hidden = false;

  soundButton.addEventListener('click', () => {
    if (audio.paused && running && audio.currentTime < AUDIO_END_SECONDS) {
      audio.muted = false;
      playAudio();
    } else {
      audio.muted = !audio.muted;
    }

    soundButton.textContent = audio.muted ? 'Unmute' : 'Mute';
    soundButton.setAttribute('aria-label', soundButton.textContent);
    document.getElementById('audio-note').hidden = true;
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) {
    pauseButton.click();
  }
});
