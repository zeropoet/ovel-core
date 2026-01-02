let system;
let activeZ = 0;
let activeTraversal = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 255);

    system = new SolarSystem();
}

function draw() {
    background(10, 10, 20);

    system.update();

    // draw one z-slice
    drawCubeSlice(system.cube, activeZ);

    // highlight one traversal
    highlightTraversal(
        system.cube.allTraversals()[activeTraversal]
    );
}

function drawCubeSlice(cube, z) {
    const scale = min(width, height) / cube.size;

    cube.nodes
        .filter(n => n.z === z)
        .forEach(n => {
            const x = n.x * scale + scale / 2;
            const y = n.y * scale + scale / 2;

            fill(
                200,
                200,
                map(n.load, 0, 1, 80, 255)
            );
            noStroke();
            circle(x, y, scale * 0.6);
        });
}

function highlightTraversal(traversal) {
    const scale = min(width, height) / system.cube.size;

    stroke(0, 0, 255);
    strokeWeight(3);
    noFill();

    beginShape();
    traversal.nodes.forEach(n => {
        const x = n.x * scale + scale / 2;
        const y = n.y * scale + scale / 2;
        vertex(x, y);
    });
    endShape();
}

function keyPressed() {
    if (key === 'Z') {
        activeZ = (activeZ + 1) % system.cube.size;
    }

    if (key === 'T') {
        activeTraversal =
            (activeTraversal + 1) %
            system.cube.allTraversals().length;
    }
}
