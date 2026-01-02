const OVEL_INVARIANT = 136;
Object.freeze(OVEL_INVARIANT);


class FieldNode {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value; // numeric contribution
        this.load = 0;      // Saturn pressure
    }
}


class SpaceField {
    constructor(resolution = 40) {
        this.resolution = resolution;
        this.nodes = [];
        this.time = 0;

        let raw = [];

        for (let x = 0; x < width; x += resolution) {
            for (let y = 0; y < height; y += resolution) {
                raw.push(new FieldNode(x, y, random()));
            }
        }

        this.nodes = this.normalizeToInvariant(raw);
    }

    normalizeToInvariant(nodes) {
        const sum = nodes.reduce((s, n) => s + n.value, 0);
        return nodes.map(n => {
            n.value = (n.value / sum) * OVEL_INVARIANT;
            return n;
        });
    }

    resolve() {
        return this.nodes.reduce((s, n) => s + n.value, 0);
    }

    update() {
        this.time++;
    }

    draw() {
        noStroke();
        this.nodes.forEach(n => {
            fill(200, 200, map(n.load, 0, 1, 100, 255));
            circle(n.x, n.y, this.resolution * 0.8);
        });
    }
}


class Planet {
    constructor(name, cycleRate) {
        this.name = name;
        this.cycleRate = cycleRate;
    }

    apply(field) {
        throw new Error(`${this.name} must implement apply()`);
    }
}


class Saturn extends Planet {
    constructor() {
        super("Saturn", 60);
    }

    apply(field) {
        const centerX = width / 2;
        const centerY = height / 2;

        field.nodes.forEach(n => {
            const d = dist(centerX, centerY, n.x, n.y);
            n.load = constrain(d / (min(width, height) / 2), 0, 1);
        });
    }
}


class Jupiter extends Planet {
    constructor() {
        super("Jupiter", 90);
    }

    apply(field) {
        const expanded = [];

        field.nodes.forEach(n => {
            const spread = (1 - n.load) * 0.02;
            expanded.push(n.value + spread);
        });

        // renormalize — Jupiter may never exceed 136
        const sum = expanded.reduce((a, b) => a + b, 0);

        field.nodes.forEach((n, i) => {
            n.value = (expanded[i] / sum) * OVEL_INVARIANT;
        });
    }
}


class Sun extends Planet {
    constructor() {
        super("Sun", 1);
    }

    apply(field) {
        const resolved = field.resolve();
        if (Math.abs(resolved - OVEL_INVARIANT) > 0.0001) {
            throw new Error(
                `SUN FAILURE: ${resolved} ≠ ${OVEL_INVARIANT}`
            );
        }
    }
}


class SolarSystem {
    constructor() {
        this.field = new SpaceField(40);
        this.planets = [
            new Saturn(),
            new Jupiter(),
            new Sun()
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


let system;

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 255);
    system = new SolarSystem();
}

function draw() {
    background(10, 10, 20);
    system.update();
    system.draw();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
