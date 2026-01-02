const OVEL_INVARIANT = 136;

class Traversal {
    constructor(name, nodes) {
        this.name = name;
        this.nodes = nodes;
    }

    resolve() {
        return this.nodes.reduce((s, n) => s + n.value, 0);
    }

    assertInvariant() {
        const r = this.resolve();
        if (Math.abs(r - OVEL_INVARIANT) > 0.0001) {
            throw new Error(
                `TRAVERSAL FAILURE [${this.name}]: ${r} ≠ ${OVEL_INVARIANT}`
            );
        }
        return true;
    }
}


class CubeField {
    constructor(size = 4) {
        this.size = size;
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

    /* ───────── TRAVERSAL GENERATORS ───────── */

    xLines() {
        const t = [];
        for (let y = 0; y < this.size; y++) {
            for (let z = 0; z < this.size; z++) {
                t.push(new Traversal(
                    `X(y=${y},z=${z})`,
                    [...Array(this.size)].map(x => this.nodeAt(x, y, z))
                ));
            }
        }
        return t;
    }

    yLines() {
        const t = [];
        for (let x = 0; x < this.size; x++) {
            for (let z = 0; z < this.size; z++) {
                t.push(new Traversal(
                    `Y(x=${x},z=${z})`,
                    [...Array(this.size)].map(y => this.nodeAt(x, y, z))
                ));
            }
        }
        return t;
    }

    zLines() {
        const t = [];
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                t.push(new Traversal(
                    `Z(x=${x},y=${y})`,
                    [...Array(this.size)].map(z => this.nodeAt(x, y, z))
                ));
            }
        }
        return t;
    }

    spaceDiagonals() {
        const s = this.size - 1;
        return [
            new Traversal("D(0→n,0→n,0→n)",
                [...Array(this.size)].map(i => this.nodeAt(i, i, i))
            ),
            new Traversal("D(0→n,0→n,n→0)",
                [...Array(this.size)].map(i => this.nodeAt(i, i, s - i))
            ),
            new Traversal("D(0→n,n→0,0→n)",
                [...Array(this.size)].map(i => this.nodeAt(i, s - i, i))
            ),
            new Traversal("D(n→0,0→n,0→n)",
                [...Array(this.size)].map(i => this.nodeAt(s - i, i, i))
            )
        ];
    }

    allTraversals() {
        return [
            ...this.xLines(),
            ...this.yLines(),
            ...this.zLines(),
            ...this.spaceDiagonals()
        ];
    }
}


class Sun extends Planet {
    constructor() {
        super("Sun", 1);
    }

    apply(cube) {
        const traversals = cube.allTraversals();
        traversals.forEach(t => t.assertInvariant());
    }
}


class SolarSystem {
    constructor() {
        this.cube = new CubeField(4);
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


