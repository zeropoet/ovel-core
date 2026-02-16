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
const BACKGROUND_COLOR = [255, 20];
const SUN_MASS = 1000;
const CROSSHAIR_ATTRACT_G = 0.007;
const CROSSHAIR_ATTRACT_MIN_SQ = 1;
const CROSSHAIR_ATTRACT_MAX_SQ = 1000;
const CROSSHAIR_ATTRACT_BOOST = 10000000;
const SUN_PULL_G = 300000;
const SUN_PULL_MIN_SQ = 50;
const SUN_PULL_MAX_SQ = 100;
const VELA_PAIR_ORBIT_G = 0.012;
const VELA_PAIR_ORBIT_SWIRL = 0.22;
const VELA_PAIR_ORBIT_MIN_SQ = 140;
const VELA_PAIR_ORBIT_MAX_SQ = 22000;
const VELA_COLLISION_RESTITUTION = 0.14;
const VELA_COLLISION_FRICTION = 0.09;
const VELA_COLLISION_CORRECTION = 0.65;
const SUN_AURA_BASE_SIZE = 1.35;
const SUN_AURA_PULSE_SIZE = 0.06;
const SUN_AURA_PULSE_RATE = 0.0012;
const SUN_AURA_MAX_ALPHA = 28;
const CSS_DPI = 96;
const CAPTURE_DURATION_MS = 60000;
const CAPTURE_FILENAME = 'ovel-core-capture';
const CAPTURE_FPS = 30;
const IMAGE_CAPTURE_SCALE = 4;
const IMAGE_CAPTURE_MAX_PIXELS = 32000000;
const VIDEO_CAPTURE_FORMATS = [
  { mimeType: 'video/mp4;codecs=avc1' },
  { mimeType: 'video/mp4;codecs=h264' },
  { mimeType: 'video/mp4' }
];
const CAPTURE_DURATION_SECONDS = CAPTURE_DURATION_MS / 1000;

let isCapturingVideo = false;
let isCapturingImage = false;
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
  sun.beginSwell();
  for (let vela of velas) {
    sun.attract(vela);
    let force = p5.Vector.sub(crosshairPos, vela.pos);
    let distanceSq = constrain(force.magSq(), CROSSHAIR_ATTRACT_MIN_SQ, CROSSHAIR_ATTRACT_MAX_SQ);
    let strength = ((CROSSHAIR_MASS * vela.mass) / distanceSq) * CROSSHAIR_ATTRACT_G * CROSSHAIR_ATTRACT_BOOST;
    force.setMag(strength);
    vela.applyForce(force);
  }
  applySubtleVelaOrbits();
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
  updateCrosshair();
  renderSceneToTarget(null, 1, showCrosshair);
}

function renderSceneToTarget(target = null, scale = 1, includeCrosshair = false) {
  if (target) {
    target.background(...BACKGROUND_COLOR);
    drawSunAura(target, scale);
    sun.show(target, scale);
    for (let vela of velas) {
      vela.showTrail(target, scale, width, height);
      vela.show(target, scale);
    }
    if (includeCrosshair) drawCrosshair(target, scale);
    return;
  }
  background(...BACKGROUND_COLOR);
  drawSunAura();
  sun.show();
  for (let vela of velas) {
    vela.update();
  }
  resolveVelaCollisions();
  for (let vela of velas) {
    vela.showTrail();
    vela.show();
  }
  if (includeCrosshair) drawCrosshair();
}


function keyPressed() {
  if (key === 'g' || key === 'G') captureMov();
  if (key === 's' || key === 'S') captureStillImage();
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
  if (isCapturingVideo || isCapturingImage) return;
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

function captureStillImage() {
  if (isCapturingVideo || isCapturingImage) return;
  isCapturingImage = true;
  showCaptureProgress('Preparing image...', 0.1, 'Calculating export size');
  try {
    const size = computeImageCaptureSize(width, height, IMAGE_CAPTURE_SCALE, IMAGE_CAPTURE_MAX_PIXELS);
    showCaptureProgress('Rendering image...', 0.45, `${size.exportWidth}x${size.exportHeight}`);

    const pg = createGraphics(size.exportWidth, size.exportHeight);
    pg.pixelDensity(1);
    renderSceneToTarget(pg, size.scale, showCrosshair);

    showCaptureProgress('Saving image...', 0.9, 'Encoding PNG');
    const filename = `${CAPTURE_FILENAME}-${size.exportWidth}x${size.exportHeight}-${timestampForFilename()}.png`;
    const dataUrl = pg.elt.toDataURL('image/png');
    downloadDataUrl(dataUrl, filename);
    if (typeof pg.remove === 'function') pg.remove();

    showCaptureProgress('Image saved', 1, filename);
    scheduleHideCaptureProgress();
  } catch (error) {
    showCaptureProgress('Image capture failed', 1, 'See console for details');
    scheduleHideCaptureProgress();
    console.error('Image capture failed:', error);
  } finally {
    isCapturingImage = false;
  }
}

function computeImageCaptureSize(sourceWidth, sourceHeight, requestedScale, maxPixels) {
  let scale = requestedScale;
  const sourcePixels = sourceWidth * sourceHeight;
  if (sourcePixels * scale * scale > maxPixels) {
    scale = Math.sqrt(maxPixels / sourcePixels);
  }
  const exportWidth = max(1, floor(sourceWidth * scale));
  const exportHeight = max(1, floor(sourceHeight * scale));
  return { scale, exportWidth, exportHeight };
}

function timestampForFilename() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
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

function drawSunAura(renderer = null, scale = 1) {
  if (!sun) return;
  let pulse = Math.sin(millis() * SUN_AURA_PULSE_RATE) * 0.5 + 0.5;
  let size = SUN_AURA_BASE_SIZE + SUN_AURA_PULSE_SIZE * pulse;
  let auraDiameter = sun.r * 2 * size;
  let auraAlpha = constrain((sun.sunAlpha / 255) * SUN_AURA_MAX_ALPHA, 0, SUN_AURA_MAX_ALPHA);

  if (renderer) {
    renderer.push();
    renderer.noStroke();
    renderer.blendMode(ADD);
    renderer.fill(255, 250, 225, auraAlpha);
    renderer.ellipse(sun.pos.x * scale, sun.pos.y * scale, auraDiameter * scale);
    renderer.pop();
    return;
  }
  push();
  noStroke();
  blendMode(ADD);
  fill(255, 250, 225, auraAlpha);
  ellipse(sun.pos.x, sun.pos.y, auraDiameter);
  pop();
}

function applySubtleVelaOrbits() {
  for (let i = 0; i < velas.length; i++) {
    const a = velas[i];
    for (let j = i + 1; j < velas.length; j++) {
      const b = velas[j];
      let dx = b.pos.x - a.pos.x;
      let dy = b.pos.y - a.pos.y;
      let distSq = dx * dx + dy * dy;
      if (distSq < VELA_PAIR_ORBIT_MIN_SQ || distSq > VELA_PAIR_ORBIT_MAX_SQ) continue;

      const dist = Math.sqrt(distSq);
      if (dist < 0.0001) continue;
      const nx = dx / dist;
      const ny = dy / dist;
      const tx = -ny;
      const ty = nx;

      distSq = constrain(distSq, VELA_PAIR_ORBIT_MIN_SQ, VELA_PAIR_ORBIT_MAX_SQ);
      const pull = ((a.mass * b.mass) / distSq) * VELA_PAIR_ORBIT_G;
      const orbitSign = ((i + j) & 1) === 0 ? 1 : -1;
      const swirl = pull * VELA_PAIR_ORBIT_SWIRL * orbitSign;

      const fx = nx * pull + tx * swirl;
      const fy = ny * pull + ty * swirl;

      a.acc.x += fx / Math.max(a.mass, 0.0001);
      a.acc.y += fy / Math.max(a.mass, 0.0001);
      b.acc.x -= fx / Math.max(b.mass, 0.0001);
      b.acc.y -= fy / Math.max(b.mass, 0.0001);
    }
  }
}

function resolveVelaCollisions() {
  for (let i = 0; i < velas.length; i++) {
    const a = velas[i];
    for (let j = i + 1; j < velas.length; j++) {
      const b = velas[j];
      let dx = b.pos.x - a.pos.x;
      let dy = b.pos.y - a.pos.y;
      let distSq = dx * dx + dy * dy;
      const minDist = a.r + b.r;
      if (distSq > minDist * minDist) continue;

      if (distSq < 1e-8) {
        const n = p5.Vector.random2D();
        dx = n.x * 0.001;
        dy = n.y * 0.001;
        distSq = dx * dx + dy * dy;
      }

      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      if (overlap <= 0) continue;

      const invMassA = 1 / Math.max(a.mass, 0.0001);
      const invMassB = 1 / Math.max(b.mass, 0.0001);
      const invMassSum = invMassA + invMassB;
      if (invMassSum <= 0) continue;

      const correction = (overlap * VELA_COLLISION_CORRECTION) / invMassSum;
      a.pos.x -= nx * correction * invMassA;
      a.pos.y -= ny * correction * invMassA;
      b.pos.x += nx * correction * invMassB;
      b.pos.y += ny * correction * invMassB;

      const rvx = b.vel.x - a.vel.x;
      const rvy = b.vel.y - a.vel.y;
      const velAlongNormal = rvx * nx + rvy * ny;
      if (velAlongNormal > 0) continue;

      const normalImpulseMag = (-(1 + VELA_COLLISION_RESTITUTION) * velAlongNormal) / invMassSum;
      const impulseX = normalImpulseMag * nx;
      const impulseY = normalImpulseMag * ny;
      a.vel.x -= impulseX * invMassA;
      a.vel.y -= impulseY * invMassA;
      b.vel.x += impulseX * invMassB;
      b.vel.y += impulseY * invMassB;

      const tangentXRaw = rvx - velAlongNormal * nx;
      const tangentYRaw = rvy - velAlongNormal * ny;
      const tangentLen = Math.sqrt(tangentXRaw * tangentXRaw + tangentYRaw * tangentYRaw);
      if (tangentLen < 1e-8) continue;

      const tx = tangentXRaw / tangentLen;
      const ty = tangentYRaw / tangentLen;
      let frictionImpulseMag = (-(rvx * tx + rvy * ty)) / invMassSum;
      const maxFriction = normalImpulseMag * VELA_COLLISION_FRICTION;
      frictionImpulseMag = constrain(frictionImpulseMag, -maxFriction, maxFriction);

      const frictionX = frictionImpulseMag * tx;
      const frictionY = frictionImpulseMag * ty;
      a.vel.x -= frictionX * invMassA;
      a.vel.y -= frictionY * invMassA;
      b.vel.x += frictionX * invMassB;
      b.vel.y += frictionY * invMassB;
    }
  }
}

function drawCrosshair(renderer = null, scale = 1) {
  const cx = crosshairPos.x;
  const cy = crosshairPos.y;
  if (renderer) {
    renderer.push();
    renderer.stroke(255, 0, 0, 200);
    renderer.strokeWeight(1 * scale);
    renderer.noFill();
    renderer.line((cx - 6) * scale, cy * scale, (cx + 6) * scale, cy * scale);
    renderer.line(cx * scale, (cy - 6) * scale, cx * scale, (cy + 6) * scale);
    renderer.pop();
    return;
  }
  push();
  stroke(255, 0, 0, 200);
  strokeWeight(1);
  noFill();
  line(cx - 6, cy, cx + 6, cy);
  line(cx, cy - 6, cx, cy + 6);
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
