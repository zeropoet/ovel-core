let velas = [];
let sun;
let cnv;
let showCrosshair = false;
let crosshairPos;
let crosshairVel;
const CROSSHAIR_SPEED = 0.35;
const CROSSHAIR_MAX_SPEED = 6;
const CROSSHAIR_MASS = 120;
const VELA_COUNT = 12;
const VELA_MASS_MIN = 50;
const VELA_MASS_MAX = 100;
const BACKGROUND_COLOR = [255, 50];
const SUN_MASS = 1000;
const CROSSHAIR_ATTRACT_G = 0.007;
const CROSSHAIR_ATTRACT_MIN_SQ = 500;
const CROSSHAIR_ATTRACT_MAX_SQ = 5000;
const CROSSHAIR_ATTRACT_BOOST = 10;
const SUN_PULL_G = 3;
const SUN_PULL_MIN_SQ = 50;
const SUN_PULL_MAX_SQ = 100;


function setup() {
  applyPixelDensity();
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
  if (keyCode === ENTER) {
    showCrosshair = !showCrosshair;
  }
}


function windowResized() {
  applyPixelDensity();
  resizeCanvas(windowWidth, windowHeight);
  crosshairPos.set(width / 2, height / 2);
}


function applyPixelDensity() {
  const dpr = window.devicePixelRatio || 1;
  pixelDensity(Math.min(dpr, 2));
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
