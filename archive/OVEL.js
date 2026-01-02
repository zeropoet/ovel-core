class Planet {
    constructor(name, params = {}) {
        this.name = name;
        this.cycleRate = params.cycleRate || 60;
        this.influenceRadius = params.influenceRadius || 200;
        this.bias = params.bias || 0;
    }

    apply(field) {
        // overridden by subclasses
    }
}

class SpaceField {
    constructor(resolution = 40) {
        this.resolution = resolution;
        this.nodes = [];
        this.time = 0;

        for (let x = 0; x < width; x += resolution) {
            for (let y = 0; y < height; y += resolution) {
                this.nodes.push({
                    x,
                    y,
                    energy: random(),
                    coherence: 1,
                    velocity: p5.Vector.random2D()
                });
            }
        }
    }

    update() {
        this.time++;
    }

    draw() {
        noStroke();
        this.nodes.forEach(n => {
            fill(200 * n.coherence, 150, 255 * n.energy);
            circle(n.x, n.y, this.resolution * n.energy);
        });
    }
}

//Jupiter never destroys. It smooths.
class Jupiter extends Planet {
    constructor() {
        super("Jupiter", {
            cycleRate: 90,
            influenceRadius: 250,
            bias: 0.03
        });
    }

    apply(field) {
        field.nodes.forEach(n => {
            let d = dist(mouseX, mouseY, n.x, n.y);
            if (d < this.influenceRadius) {
                n.energy += this.bias * (1 - d / this.influenceRadius);
                n.energy = constrain(n.energy, 0, 1);
                n.coherence = lerp(n.coherence, 1, 0.02); // mercy
            }
        });
    }
}

//Saturn introduces mortality.
class Saturn extends Planet {
    constructor() {
        super("Saturn", {
            cycleRate: 60,
            influenceRadius: 220,
            bias: 0.02
        });
    }

    apply(field) {
        field.nodes.forEach(n => {
            let d = dist(width / 2, height / 2, n.x, n.y);
            if (d < this.influenceRadius) {
                n.energy -= this.bias;
                n.energy = max(n.energy, 0.1);
                n.coherence -= 0.01; // pressure
            }
        });
    }
}

class Mars extends Planet {
    apply(field) {
        // injects velocity, conflict, turbulence
    }
}

class Venus extends Planet {
    apply(field) {
        // attraction, clustering, smoothing
    }
}

class Mercury extends Planet {
    apply(field) {
        // rapid oscillation, message passing
    }
}

class Sun extends Planet {
    apply(field) {
        // central coherence anchor
    }
}

//This is the cosmic clock.
class SolarSystem {
    constructor() {
        this.field = new SpaceField(40);
        this.planets = [
            new Jupiter(),
            new Saturn()
        ];
    }

    update() {
        this.field.update();

        this.planets.forEach(p => {
            if (frameCount % p.cycleRate === 0) {
                p.apply(this.field);
            }
        });
    }

    draw() {
        this.field.draw();
    }
}

//Minimum Viable Universe
let system;

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 255);
    system = new SolarSystem();
}

function draw() {
    background(10, 10, 20, 40);
    system.update();
    system.draw();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
