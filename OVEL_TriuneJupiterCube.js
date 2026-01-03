let cubelets = [];
let grace = 0;
let accepted = false;

function setup() {
    createCanvas(600, 600, WEBGL);
    colorMode(RGB, 255);
    noStroke();

    // Build cubelets (normalized space)
    let steps = [-1.5, -0.5, 0.5, 1.5];
    let unit = 1 / 4;

    for (let x of steps) {
        for (let y of steps) {
            for (let z of steps) {
                cubelets.push({
                    x: x * unit,
                    y: y * unit,
                    z: z * unit
                });
            }
        }
    }
}

function draw() {
    background(255, 255, 255);

    // Camera restraint
    rotateY(frameCount * .005);
    rotateX(-0.3);

    // Mercy accumulates through stillness
    if (!accepted) {
        grace = min(grace + 0.0003, 1);
    }

    let epsilon = grace * 0.03;
    let size = 30;

    for (let c of cubelets) {
        push();

        // ε-separation (softening without rupture)
        let sx = c.x + Math.sign(c.x) * epsilon;
        let sy = c.y + Math.sign(c.y) * epsilon;
        let sz = c.z + Math.sign(c.z) * epsilon;

        translate(sx * 200, sy * 200, sz * 200);

        // Mercy light (subtle, undeserved)
        let glow = map(grace, 0, 1, 40, 120);
        ambientMaterial(glow, glow * 0.9, glow * 0.7);

        box(size);
        pop();
    }
}