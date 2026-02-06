class Vela {
  constructor(x, y, vx, vy, m, isSun = false) {
    this.pos = createVector(x, y);
    this.prev = this.pos.copy();
    this.vel = createVector(vx, vy);
    this.acc = createVector(0, 0);
    this.mass = m;
    this.baseR = sqrt(this.mass);
    this.r = this.baseR;
    this.isSun = isSun;
    this.swell = 0;
  }

  beginSwell() {
    if (!this.isSun) return;
    this.swell = 0;
  }

  applyForce(force) {
    let f = p5.Vector.div(force, this.mass);
    this.acc.add(f);
  }

  attract(vela) {
    let force = p5.Vector.sub(this.pos, vela.pos);
    let distanceSq = constrain(force.magSq(), 100, 1000);
    let G = 0.07;
    let strength = ((this.mass * vela.mass) / distanceSq) * G;
    force.setMag(strength);
    vela.applyForce(force);

    if (this.isSun) {
      let d = sqrt(distanceSq);
      let t = 1 - (d - 10) / (sqrt(1000) - 10);
      t = constrain(t, 0, 1);
      if (t > 0) {
        let massFactor = sqrt(vela.mass) / 10;
        this.swell += (t * t) * 18 * massFactor;
      }
    }
  }

  applySwell() {
    if (!this.isSun) return;
    let targetR = this.baseR + this.swell;
    this.r = lerp(this.r, targetR, 0.07);
  }

  update() {
    this.prev.set(this.pos);
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  showTrail() {
    if (abs(this.pos.x - this.prev.x) > width / 2) return;
    if (abs(this.pos.y - this.prev.y) > height / 2) return;
    stroke(0, 70);
    strokeWeight(3);
    line(this.prev.x, this.prev.y, this.pos.x, this.pos.y);
  }

  show() {
    if (this.isSun) {
      stroke(255);
      strokeWeight(1);
      noFill();
    } else {
      fill(0);
    }
    ellipse(this.pos.x, this.pos.y, this.r * 2);
  }
}
