const SUN_SCALE = .1;
const SUN_ATTRACT_MIN_SQ = 100000;
const SUN_ATTRACT_MAX_SQ = 1000000;
const SUN_ATTRACT_G = .007;
const SUN_INFLUENCE_RADIUS = 100;
const SUN_MAX_RADIUS = 100;
const SUN_MIN_RADIUS = 1;
const SUN_FADE_MS = 10000;
const SUN_SCALE_LERP = 0.001;
const SUN_ALPHA_LERP = 0.008;

class Vela {
  constructor(x, y, vx, vy, m, isSun = false) {
    this.pos = createVector(x, y);
    this.prev = this.pos.copy();
    this.vel = createVector(vx, vy);
    this.acc = createVector(0, 0);
    this.baseMass = m;
    this.mass = m;
    this.baseR = sqrt(this.baseMass) * (isSun ? SUN_SCALE : 1);
    this.r = this.baseR;
    this.isSun = isSun;
    this.swell = 0;
    this.massSwell = 0;
    this.influencedThisFrame = false;
    this.wasInfluenced = false;
    this.exitStartMs = 0;
    this.exitStartR = this.r;
    this.exitStartMass = this.mass;
    this.sunAlpha = 255;
  }

  beginSwell() {
    if (!this.isSun) return;
    this.swell = 0;
    this.massSwell = 0;
    this.influencedThisFrame = false;
  }

  applyForce(force) {
    let f = p5.Vector.div(force, this.mass);
    this.acc.add(f);
  }

  attract(vela) {
    let force = p5.Vector.sub(this.pos, vela.pos);
    let rawDistanceSq = force.magSq();
    let distanceSq = constrain(rawDistanceSq, SUN_ATTRACT_MIN_SQ, SUN_ATTRACT_MAX_SQ);
    let strength = ((this.mass * vela.mass) / distanceSq) * SUN_ATTRACT_G;
    force.setMag(strength);
    vela.applyForce(force);

    if (this.isSun) {
      let d = sqrt(rawDistanceSq);
      let t = 1 - d / SUN_INFLUENCE_RADIUS;
      t = constrain(t, 0, 1);
      if (t > 0) {
        this.swell += vela.mass;
        this.massSwell += vela.mass;
        this.influencedThisFrame = true;
      }
    }
  }


  applySwell() {
    if (!this.isSun) return;
    if (this.influencedThisFrame) {
      this.mass = this.baseMass + this.massSwell;
      let targetR = min(this.baseR + this.swell, SUN_MAX_RADIUS);
      this.r = lerp(this.r, targetR, SUN_SCALE_LERP);
      this.sunAlpha = lerp(this.sunAlpha, 255, SUN_ALPHA_LERP);
      this.wasInfluenced = true;
    } else {
      if (this.wasInfluenced) {
        this.exitStartMs = millis();
        this.exitStartR = this.r;
        this.exitStartMass = this.mass;
        this.wasInfluenced = false;
      }
      let t = constrain((millis() - this.exitStartMs) / SUN_FADE_MS, 0, 1);
      let ease = 1 - pow(1 - t, 3);
      this.sunAlpha = lerp(255, 0, ease);
      this.r = lerp(this.exitStartR, SUN_MIN_RADIUS, ease);
    }
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
    stroke(0, 1);
    strokeWeight(100);
    line(this.prev.x, this.prev.y, this.pos.x, this.pos.y);
  }


  show() {
    if (this.isSun) {
      stroke(255, this.sunAlpha);
      strokeWeight(1);
      // noFill();
    } else {
      fill(0);
    }
    ellipse(this.pos.x, this.pos.y, this.r * 2);
  }
}
