class Vela {
  constructor(x, y, vx, vy, m) {
    this.pos = createVector(x, y);
    this.vel = createVector(vx, vy);
    this.acc = createVector(0, 0);
    this.mass = m;
    this.r = sqrt(this.mass);
  }

  applyForce(force) {
    let f = p5.Vector.div(force, this.mass);
    this.acc.add(f);
  }

  attract(vela) {
    let force = p5.Vector.sub(this.pos, vela.pos);
    let distanceSq = constrain(force.magSq(), 100, 1000);
    let G = 0.1;
    let strength = ((this.mass * vela.mass) / distanceSq) * G;
    force.setMag(strength);
    vela.applyForce(force);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.set(0, 0);
  }

  show() {
    fill(0);
    ellipse(this.pos.x, this.pos.y, this.r * 2);
  }
}
