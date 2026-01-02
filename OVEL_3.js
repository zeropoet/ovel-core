const OVEL_INVARIANT = 136;
Object.freeze(OVEL_INVARIANT);


class CubeNode {
    constructor(x, y, z, value) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.value = value; // must contribute to 136
        this.load = 0;      // Saturn pressure
    }
}


class CubeField {
    constructor(size = 4) {
        this.size = size; // NxNxN
        this.nodes = [];
        this.time = 0;

        let raw = [];

        for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
                for (let z = 0; z < size; z++) {
                    raw.push(new CubeNode(x, y, z, random()));
                }
            }
        }

        this.nodes = this.normalizeToInvariant(raw);
    }

    normalizeToInvariant(nodes) {
        const sum = nodes.reduce((s, n) => s + n.value, 0);
        nodes.forEach(n => {
            n.value = (n.value / sum) * OVEL_INVARIANT;
        });
        return nodes;
    }

    resolve() {
        return this.nodes.reduce((s, n) => s + n.value, 0);
    }

    nodeAt(x, y, z) {
        return this.nodes.find(
            n => n.x === x && n.y === y && n.z === z
        );
    }

    update() {
        this.time++;
    }
}


class Planet {
    constructor(name, cycleRate) {
        this.name = name;
        this.cycleRate = cycleRate;
    }

    apply(cube) {
        throw new Error(`${this.name} must implement apply()`);
    }
}


class Saturn extends Planet {
    constructor() {
        super("Saturn", 60);
    }

    apply(cube) {
        const c = (cube.size - 1) / 2;

        cube.nodes.forEach(n => {
            const d = dist(n.x, n.y, n.z, c, c, c);
            const maxD = dist(0, 0, 0, c, c, c);
            n.load = constrain(d / maxD, 0, 1);
        });
    }
}


class Jupiter extends Planet {
    constructor() {
        super("Jupiter", 90);
    }

    apply(cube) {
        let redistributed = cube.nodes.map(n => {
            const expansion = (1 - n.load) * 0.05;
            return n.value + expansion;
        });

        const sum = redistributed.reduce((a, b) => a + b, 0);

        cube.nodes.forEach((n, i) => {
            n.value = (redistributed[i] / sum) * OVEL_INVARIANT;
        });
    }
}


class Sun extends Planet {
    constructor() {
        super("Sun", 1);
    }

    apply(cube) {
        const resolved = cube.resolve();
        if (Math.abs(resolved - OVEL_INVARIANT) > 0.0001) {
            throw new Error(
                `SUN FAILURE: ${resolved} ≠ ${OVEL_INVARIANT}`
            );
        }
    }
}


class SolarSystem {
    constructor() {
        this.cube = new CubeField(4); // 4×4×4 = 64 nodes
        this.planets = [
            new Saturn(),
            new Jupiter(),
            new Sun()
        ];
    }

    update() {
        this.cube.update();

        this.planets.forEach(p => {
            if (frameCount % p.cycleRate === 0) {
                p.apply(this.cube);
            }
        });
    }
}


function drawCubeSlice(cube, zSlice = 0) {
    const scale = min(width, height) / cube.size;

    cube.nodes
        .filter(n => n.z === zSlice)
        .forEach(n => {
            const x = n.x * scale + scale / 2;
            const y = n.y * scale + scale / 2;
            fill(200, 200, map(n.load, 0, 1, 100, 255));
            circle(x, y, scale * 0.6);
        });
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
    drawCubeSlice(system.cube, frameCount % system.cube.size);
}
