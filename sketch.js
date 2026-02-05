let velas = [];
let sun;
let cnv;
let showCrosshair = false;

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

  sun = new Vela(width / 2, height / 2, 0, 0, 300);

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

  if (showCrosshair) {
    //blendMode(DIFFERENCE);
  }

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
    vela.show();
  }

  if (showCrosshair) {
    blendMode(BLEND);
    push();
    stroke(255, 0, 0, 200);
    strokeWeight(1);
    noFill();
    let cx = width / 2;
    let cy = height / 2;
    line(cx - 6, cy, cx + 6, cy);
    line(cx, cy - 6, cx, cy + 6);
    pop();
  }

  //sun.show();
}

function keyPressed() {
  if (keyCode === ENTER) {
    showCrosshair = !showCrosshair;
  }
}

function windowResized() {
  applyPixelDensity();
  resizeCanvas(windowWidth, windowHeight);
}

function applyPixelDensity() {
  const dpr = window.devicePixelRatio || 1;
  pixelDensity(Math.min(dpr, 2));
}
