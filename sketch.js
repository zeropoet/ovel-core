let velas = [];
let sun;
let cnv;
let showCrosshair = false;
let crosshairPos;
let crosshairVel;
const crosshairSpeed = 0.35;
const crosshairMaxSpeed = 6;

function setup() {
  applyPixelDensity();
  cnv = createCanvas(windowWidth, windowHeight);

  cnv.position(0, 0);
  cnv.style('z-index', '0');
  cnv.style('position', 'fixed');
  cnv.style('top', '0');
  cnv.style('left', '0');
  cnv.style('pointer-events', 'none');

  background(220);

  sun = new Vela(width / 2, height / 2, 0, 0, 1000, true);
  crosshairPos = createVector(width / 2, height / 2);
  crosshairVel = createVector(0, 0);

  for (let i = 0; i < 10; i++) {
    let x = random(width);
    let y = random(height);
    let v = p5.Vector.random2D();
    let m = random(50, 150);
    velas[i] = new Vela(x, y, v.x, v.y, m);
  }
}

function draw() {
  background(220, 90);

  sun.show();

  for (let vela of velas) {
    sun.attract(vela);
    for (let other of velas) {
      if (vela !== other) {
        vela.attract(other);
      }
    }
  }

  for (let vela of velas) {
    vela.update();
    vela.showTrail();
    vela.show();
  }

  updateCrosshair();

  if (showCrosshair) {
    blendMode(BLEND);
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
    let accel = createVector(ax, ay).setMag(crosshairSpeed);
    crosshairVel.add(accel);
  } else {
    crosshairVel.mult(0.985);
  }

  crosshairVel.limit(crosshairMaxSpeed);
  crosshairPos.add(crosshairVel);

  if (crosshairPos.x < 0) crosshairPos.x = width;
  if (crosshairPos.x > width) crosshairPos.x = 0;
  if (crosshairPos.y < 0) crosshairPos.y = height;
  if (crosshairPos.y > height) crosshairPos.y = 0;
}
