let velas = [];
let sun;
let cnv;
let showCrosshair = false;
let crosshairPos;
let crosshairVel;
const CROSSHAIR_SPEED = 0.35;
const CROSSHAIR_MAX_SPEED = 6;
const CROSSHAIR_MASS = 12;
const VELA_COUNT = 211 + 4;
const VELA_MASS_MIN = 1;
const VELA_MASS_MAX = 100;
const BACKGROUND_COLOR = [255, 50];
const SUN_MASS = 1000;
const CROSSHAIR_ATTRACT_G = 0.007;
const CROSSHAIR_ATTRACT_MIN_SQ = 1;
const CROSSHAIR_ATTRACT_MAX_SQ = 1000;
const CROSSHAIR_ATTRACT_BOOST = 10000000;
const SUN_PULL_G = 30000;
const SUN_PULL_MIN_SQ = 50;
const SUN_PULL_MAX_SQ = 100;
const SUN_AURA_BASE_SIZE = 1.35;
const SUN_AURA_PULSE_SIZE = 0.06;
const SUN_AURA_PULSE_RATE = 0.0012;
const SUN_AURA_MAX_ALPHA = 28;
const CSS_DPI = 96;
const CAPTURE_DURATION_MS = 60000;
const CAPTURE_FILENAME = 'ovel-capture';
const CAPTURE_FPS = 30;
const VIDEO_CAPTURE_FORMATS = [
  { mimeType: 'video/mp4;codecs=avc1' },
  { mimeType: 'video/mp4;codecs=h264' },
  { mimeType: 'video/mp4' }
];
const CAPTURE_DURATION_SECONDS = CAPTURE_DURATION_MS / 1000;

let isCapturingVideo = false;
let captureProgressBar = null;
let captureProgressFill = null;
let captureProgressLabel = null;
let captureProgressStatus = null;
let captureHideTimer = null;

function setup() {
  applyDPI();
  cnv = createCanvas(windowWidth, windowHeight);
  cnv.position(0, 0);
  cnv.style('z-index', '0');
  cnv.style('position', 'fixed');
  cnv.style('top', '0');
  cnv.style('left', '0');
  cnv.style('pointer-events', 'none');
  background(255);
  sun = new Vela(width / 2, height / 2, 0, 0, SUN_MASS, true);
  crosshairPos = createVector(width / 2, height / 2);
  crosshairVel = createVector(0, 0);
  for (let i = 0; i < VELA_COUNT; i++) {
    let x = random(width);
    let y = random(height);
    let v = p5.Vector.random2D();
    let m = random(VELA_MASS_MIN, VELA_MASS_MAX);
    velas[i] = new Vela(x, y, v.x, v.y, m);
  }
}


function draw() {
  background(...BACKGROUND_COLOR);
  sun.beginSwell();
  for (let vela of velas) {
    sun.attract(vela);
    let force = p5.Vector.sub(crosshairPos, vela.pos);
    let distanceSq = constrain(force.magSq(), CROSSHAIR_ATTRACT_MIN_SQ, CROSSHAIR_ATTRACT_MAX_SQ);
    let strength = ((CROSSHAIR_MASS * vela.mass) / distanceSq) * CROSSHAIR_ATTRACT_G * CROSSHAIR_ATTRACT_BOOST;
    force.setMag(strength);
    vela.applyForce(force);
    for (let other of velas) {
      if (vela !== other) {
        vela.attract(other);
      }
    }
  }
  let dx = sun.pos.x - crosshairPos.x;
  let dy = sun.pos.y - crosshairPos.y;
  let distanceSq = constrain(dx * dx + dy * dy, SUN_PULL_MIN_SQ, SUN_PULL_MAX_SQ);
  let strength = (sun.mass / distanceSq) * SUN_PULL_G;
  let mag = Math.sqrt(distanceSq);
  if (mag !== 0) {
    crosshairVel.x += ((dx / mag) * strength) / CROSSHAIR_MASS;
    crosshairVel.y += ((dy / mag) * strength) / CROSSHAIR_MASS;
  }
  sun.applySwell();
  drawSunAura();
  sun.show();
  for (let vela of velas) {
    vela.update();
    vela.showTrail();
    vela.show();
  }

  updateCrosshair();

  if (showCrosshair) {
    push();
    stroke(255, 0, 0, 200);
    strokeWeight(1);
    noFill();
    let cx = crosshairPos.x;
    let cy = crosshairPos.y;
    line(cx - 6, cy, cx + 6, cy);
    line(cx, cy - 6, cx, cy + 6);
    pop();
  }
}


function keyPressed() {
  if (key === 'g' || key === 'G') captureMov();
  if (keyCode === ENTER) {
    showCrosshair = !showCrosshair;
  }
}


function windowResized() {
  applyDPI();
  resizeCanvas(windowWidth, windowHeight);
  crosshairPos.set(width / 2, height / 2);
}


function applyDPI() {
  const dpr = window.devicePixelRatio || 1;
  const dpi = dpr * CSS_DPI;
  pixelDensity(dpi / CSS_DPI);
}

async function captureMov() {
  if (isCapturingVideo) return;
  isCapturingVideo = true;
  showCaptureProgress('Preparing capture...', 0, 'Starting recorder');
  let progressIntervalId = null;
  try {
    if (!cnv || !cnv.elt || typeof cnv.elt.captureStream !== 'function') {
      showCaptureProgress('Capture unavailable', 1, 'Canvas capture is unsupported');
      scheduleHideCaptureProgress();
      console.error('Video capture is not supported: canvas captureStream is unavailable.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      showCaptureProgress('Capture unavailable', 1, 'MediaRecorder is unsupported');
      scheduleHideCaptureProgress();
      console.error('Video capture is not supported: MediaRecorder is unavailable.');
      return;
    }

    const stream = cnv.elt.captureStream(CAPTURE_FPS);
    const selectedFormat = pickSupportedVideoFormat();
    if (!selectedFormat) {
      showCaptureProgress('Capture unavailable', 1, 'MP4 recording is unsupported in this browser');
      scheduleHideCaptureProgress();
      stream.getTracks().forEach(track => track.stop());
      console.error('MP4 capture is not supported by this browser.');
      return;
    }
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: selectedFormat.mimeType });
    } catch (error) {
      showCaptureProgress('Capture failed', 1, 'Unable to start recorder');
      scheduleHideCaptureProgress();
      console.error('Unable to start video recorder:', error);
      stream.getTracks().forEach(track => track.stop());
      return;
    }

    const chunks = [];
    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };

    const recordingFinished = new Promise(resolve => {
      recorder.onstop = resolve;
    });

    const recordStartMs = performance.now();
    showCaptureProgress(`Recording ${CAPTURE_DURATION_SECONDS}s...`, 0, '0%');
    progressIntervalId = setInterval(() => {
      let elapsed = performance.now() - recordStartMs;
      let progress = constrain(elapsed / CAPTURE_DURATION_MS, 0, 0.96);
      let percent = Math.round(progress * 100);
      showCaptureProgress(`Recording ${CAPTURE_DURATION_SECONDS}s...`, progress, `${percent}%`);
    }, 100);

    recorder.start(250);
    setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop();
    }, CAPTURE_DURATION_MS);

    await recordingFinished;
    if (progressIntervalId) clearInterval(progressIntervalId);
    stream.getTracks().forEach(track => track.stop());
    showCaptureProgress('Finalizing video...', 0.98, 'Packaging file');

    if (!chunks.length) {
      showCaptureProgress('Capture failed', 1, 'No video data generated');
      scheduleHideCaptureProgress();
      console.error('Video capture produced no video data.');
      return;
    }

    const blobType = selectedFormat.mimeType;
    const blob = new Blob(chunks, { type: blobType });
    downloadBlob(blob, `${CAPTURE_FILENAME}.mp4`);
    showCaptureProgress('Capture complete', 1, 'Saved .mp4');
    scheduleHideCaptureProgress();
  } catch (error) {
    showCaptureProgress('Capture failed', 1, 'See console for details');
    scheduleHideCaptureProgress();
    console.error('Video capture failed:', error);
  } finally {
    if (progressIntervalId) clearInterval(progressIntervalId);
    isCapturingVideo = false;
  }
}

function pickSupportedVideoFormat() {
  for (let format of VIDEO_CAPTURE_FORMATS) {
    if (MediaRecorder.isTypeSupported(format.mimeType)) return format;
  }
  return null;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function showCaptureProgress(label, progress = 0, status = '') {
  ensureCaptureProgressUi();
  if (!captureProgressBar || !captureProgressFill || !captureProgressLabel || !captureProgressStatus) return;

  if (captureHideTimer) {
    clearTimeout(captureHideTimer);
    captureHideTimer = null;
  }
  captureProgressBar.classList.add('is-visible');
  captureProgressLabel.textContent = label;
  captureProgressStatus.textContent = status;
  captureProgressFill.style.width = `${constrain(progress, 0, 1) * 100}%`;
}

function scheduleHideCaptureProgress(delayMs = 2000) {
  if (captureHideTimer) clearTimeout(captureHideTimer);
  captureHideTimer = setTimeout(() => {
    if (!captureProgressBar) return;
    captureProgressBar.classList.remove('is-visible');
    captureHideTimer = null;
  }, delayMs);
}

function ensureCaptureProgressUi() {
  if (captureProgressBar) return;

  captureProgressBar = document.createElement('div');
  captureProgressBar.id = 'captureProgress';

  let textWrap = document.createElement('div');
  textWrap.className = 'captureProgressText';

  captureProgressLabel = document.createElement('div');
  captureProgressLabel.className = 'captureProgressLabel';

  captureProgressStatus = document.createElement('div');
  captureProgressStatus.className = 'captureProgressStatus';

  let track = document.createElement('div');
  track.className = 'captureProgressTrack';

  captureProgressFill = document.createElement('div');
  captureProgressFill.className = 'captureProgressFill';

  track.appendChild(captureProgressFill);
  textWrap.appendChild(captureProgressLabel);
  textWrap.appendChild(captureProgressStatus);
  captureProgressBar.appendChild(textWrap);
  captureProgressBar.appendChild(track);
  document.body.appendChild(captureProgressBar);
}

function drawSunAura() {
  if (!sun) return;
  let pulse = Math.sin(millis() * SUN_AURA_PULSE_RATE) * 0.5 + 0.5;
  let size = SUN_AURA_BASE_SIZE + SUN_AURA_PULSE_SIZE * pulse;
  let auraDiameter = sun.r * 2 * size;
  let auraAlpha = constrain((sun.sunAlpha / 255) * SUN_AURA_MAX_ALPHA, 0, SUN_AURA_MAX_ALPHA);

  push();
  noStroke();
  blendMode(ADD);
  fill(255, 250, 225, auraAlpha);
  ellipse(sun.pos.x, sun.pos.y, auraDiameter);
  pop();
}


function updateCrosshair() {
  if (!crosshairPos || !crosshairVel) return;
  let ax = 0;
  let ay = 0;
  if (keyIsDown(LEFT_ARROW)) ax -= 1;
  if (keyIsDown(RIGHT_ARROW)) ax += 1;
  if (keyIsDown(UP_ARROW)) ay -= 1;
  if (keyIsDown(DOWN_ARROW)) ay += 1;
  if (ax !== 0 || ay !== 0) {
    let accel = createVector(ax, ay).setMag(CROSSHAIR_SPEED);
    crosshairVel.add(accel);
  } else {
    crosshairVel.mult(0.985);
  }
  crosshairVel.limit(CROSSHAIR_MAX_SPEED);
  crosshairPos.add(crosshairVel);
  if (crosshairPos.x < 0) crosshairPos.x = width;
  if (crosshairPos.x > width) crosshairPos.x = 0;
  if (crosshairPos.y < 0) crosshairPos.y = height;
  if (crosshairPos.y > height) crosshairPos.y = 0;
}
