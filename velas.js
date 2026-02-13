const SUN_SCALE = .1;
const SUN_ATTRACT_MIN_SQ = 100000;
const SUN_ATTRACT_MAX_SQ = 1000000;
const SUN_ATTRACT_G = .007;
const SUN_INFLUENCE_RADIUS = 1000;
const SUN_MAX_RADIUS = 100;
const SUN_MIN_RADIUS = 100;
const SUN_FADE_MS = 10000;
const SUN_SCALE_LERP = 0.001;
const SUN_ALPHA_LERP = 0.008;
const TRAIL_NOISE_TIME_SCALE = 0.014;
const TRAIL_NOISE_SPATIAL_SCALE = 0.009;
const TRAIL_NOISE_WEIGHT_MIN = 18;
const TRAIL_NOISE_WEIGHT_MAX = 220;
const TRAIL_NOISE_ALPHA_MIN = 0.8;
const TRAIL_NOISE_ALPHA_MAX = 14;
const TRAIL_EDGE_NOISE_TIME_MULT = 1.8;
const TRAIL_EDGE_OFFSET_MIN = 0.35;
const TRAIL_EDGE_OFFSET_MAX = 1.1;
const TRAIL_CORE_WEIGHT_FACTOR = 0.74;
const TRAIL_EDGE_WEIGHT_FACTOR = 0.3;
const VELA_EDGE_FADE_DISTANCE = 520;
const VELA_ALPHA_LERP = 0.12;

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
    this.noiseSeed = random(10000);
    this.visibilityAlpha = 255;
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
    if (!this.isSun) {
      const targetAlpha = this.computeVisibilityAlpha();
      this.visibilityAlpha = lerp(this.visibilityAlpha, targetAlpha, VELA_ALPHA_LERP);
    }
  }

  computeVisibilityAlpha() {
    const edgeDistance = min(this.pos.x, width - this.pos.x, this.pos.y, height - this.pos.y);
    const visibleFactor = constrain(edgeDistance / VELA_EDGE_FADE_DISTANCE, 0, 1);
    return 255 * visibleFactor;
  }


  showTrail(renderer = null, scale = 1, sceneW = width, sceneH = height) {
    if (abs(this.pos.x - this.prev.x) > sceneW / 2) return;
    if (abs(this.pos.y - this.prev.y) > sceneH / 2) return;
    const segX = this.pos.x - this.prev.x;
    const segY = this.pos.y - this.prev.y;
    const segLen = sqrt(segX * segX + segY * segY);
    if (segLen < 0.0001) return;
    const nx = -segY / segLen;
    const ny = segX / segLen;

    const n = noise(
      this.noiseSeed + this.pos.x * TRAIL_NOISE_SPATIAL_SCALE,
      this.noiseSeed + this.pos.y * TRAIL_NOISE_SPATIAL_SCALE,
      frameCount * TRAIL_NOISE_TIME_SCALE
    );
    const shapedNoise = pow(n, 0.45);
    const dynamicWeight = lerp(TRAIL_NOISE_WEIGHT_MIN, TRAIL_NOISE_WEIGHT_MAX, shapedNoise);
    const dynamicAlpha = lerp(TRAIL_NOISE_ALPHA_MIN, TRAIL_NOISE_ALPHA_MAX, shapedNoise);
    const edgeNoiseA = noise(
      this.noiseSeed + 113 + this.pos.x * TRAIL_NOISE_SPATIAL_SCALE,
      this.noiseSeed + 227 + this.pos.y * TRAIL_NOISE_SPATIAL_SCALE,
      frameCount * TRAIL_NOISE_TIME_SCALE * TRAIL_EDGE_NOISE_TIME_MULT
    );
    const edgeNoiseB = noise(
      this.noiseSeed + 337 + this.pos.x * TRAIL_NOISE_SPATIAL_SCALE,
      this.noiseSeed + 443 + this.pos.y * TRAIL_NOISE_SPATIAL_SCALE,
      frameCount * TRAIL_NOISE_TIME_SCALE * TRAIL_EDGE_NOISE_TIME_MULT
    );
    const edgeOffsetA = dynamicWeight * lerp(TRAIL_EDGE_OFFSET_MIN, TRAIL_EDGE_OFFSET_MAX, pow(edgeNoiseA, 0.8));
    const edgeOffsetB = dynamicWeight * lerp(TRAIL_EDGE_OFFSET_MIN, TRAIL_EDGE_OFFSET_MAX, pow(edgeNoiseB, 0.8));
    const coreWeight = dynamicWeight * TRAIL_CORE_WEIGHT_FACTOR;
    const edgeWeight = max(1, dynamicWeight * TRAIL_EDGE_WEIGHT_FACTOR);
    const visibilityFactor = this.isSun ? 1 : this.visibilityAlpha / 255;
    const coreAlpha = dynamicAlpha * 0.45 * visibilityFactor;
    const edgeAlphaA = dynamicAlpha * lerp(0.35, 1, edgeNoiseA) * visibilityFactor;
    const edgeAlphaB = dynamicAlpha * lerp(0.35, 1, edgeNoiseB) * visibilityFactor;
    if (coreAlpha < 0.01 && edgeAlphaA < 0.01 && edgeAlphaB < 0.01) return;

    if (renderer) {
      renderer.stroke(0, coreAlpha);
      renderer.strokeWeight(coreWeight * scale);
      renderer.line(this.prev.x * scale, this.prev.y * scale, this.pos.x * scale, this.pos.y * scale);

      renderer.stroke(0, edgeAlphaA);
      renderer.strokeWeight(edgeWeight * scale);
      renderer.line(
        (this.prev.x + nx * edgeOffsetA) * scale,
        (this.prev.y + ny * edgeOffsetA) * scale,
        (this.pos.x + nx * edgeOffsetA) * scale,
        (this.pos.y + ny * edgeOffsetA) * scale
      );

      renderer.stroke(0, edgeAlphaB);
      renderer.line(
        (this.prev.x - nx * edgeOffsetB) * scale,
        (this.prev.y - ny * edgeOffsetB) * scale,
        (this.pos.x - nx * edgeOffsetB) * scale,
        (this.pos.y - ny * edgeOffsetB) * scale
      );
      return;
    }
    stroke(220, coreAlpha);
    strokeWeight(coreWeight);
    line(this.prev.x, this.prev.y, this.pos.x, this.pos.y);

    stroke(0, edgeAlphaA);
    strokeWeight(edgeWeight);
    line(
      this.prev.x + nx * edgeOffsetA,
      this.prev.y + ny * edgeOffsetA,
      this.pos.x + nx * edgeOffsetA,
      this.pos.y + ny * edgeOffsetA
    );

    stroke(220, edgeAlphaB);
    line(
      this.prev.x - nx * edgeOffsetB,
      this.prev.y - ny * edgeOffsetB,
      this.pos.x - nx * edgeOffsetB,
      this.pos.y - ny * edgeOffsetB
    );
  }


  show(renderer = null, scale = 1) {
    if (renderer) {
      if (this.isSun) {
        renderer.stroke(255, this.sunAlpha);
        renderer.strokeWeight(1 * scale);
      } else {
        renderer.fill(255, this.visibilityAlpha);
      }
      renderer.ellipse(this.pos.x * scale, this.pos.y * scale, this.r * 2 * scale);
      return;
    }
    if (this.isSun) {
      stroke(255, this.sunAlpha);
      strokeWeight(1);
      //noFill();
    } else {
      fill(255, this.visibilityAlpha);
    }
    ellipse(this.pos.x, this.pos.y, this.r * 2);
  }
}
