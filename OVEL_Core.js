let system;
let activeZ = 0;
let activeTraversal = 0;

function setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 255);

    // minimal mode
    system = new SolarSystem(true);
}

function draw() {
    background(10, 10, 20);

    system.update();

    // --- DRAW FULL SLICE ---
    drawCubeSlice(system.cube, activeZ);

    // --- HIGHLIGHT ACTIVE TRAVERSAL ---
    highlightTraversal(system.cube.allTraversals()[activeTraversal]);

    // --- SHOW TRAVERSAL SUM ---
    const traversal = system.cube.allTraversals()[activeTraversal];
    const sum = traversal.resolve();
    noStroke();
    fill(0, 0, 255);
    textSize(18);
    text(
        `Traversal: ${traversal.name} | Sum: ${sum.toFixed(2)}`,
        20,
        30
    );
}

// Map cube node coordinates to canvas coordinates
function projectNodeToScreen(n, cubeSize) {
    const margin = 50;
    const w = width - margin * 2;
    const h = height - margin * 2;
    const scaleX = w / cubeSize;
    const scaleY = h / cubeSize;

    const x = margin + n.x * scaleX + scaleX / 2;
    const y = margin + n.y * scaleY + scaleY / 2;

    return { x, y };
}

// Draw one z-slice with Saturn load and Jupiter expansion
function drawCubeSlice(cube, z) {
    const scale = min(width, height) / cube.size;

    cube.nodes
        .filter(n => n.z === z)
        .forEach(n => {
            const { x: px, y: py } = projectNodeToScreen(n, cube.size);

            // Saturn load → node color
            let hueVal = map(n.load, 0, 1, 50, 255);
            let brightness = map(n.load, 0, 1, 80, 255);
            noStroke();
            fill(200, hueVal, brightness);
            circle(px, py, scale * 0.6);

            // Jupiter expansion → halo
            let expansion = (1 - n.load) * 100;
            noFill();
            stroke(120, 255, 255, 150);
            strokeWeight(2);
            circle(px, py, scale * 0.6 + expansion);
        });
}

// Highlight a traversal
function highlightTraversal(traversal) {
    const scale = min(width, height) / system.cube.size;

    stroke(0, 0, 255);
    strokeWeight(3);
    noFill();

    beginShape();
    traversal.nodes.forEach(n => {
        const { x, y } = projectNodeToScreen(n, system.cube.size);
        vertex(x, y);
    });
    endShape();
}

// --- INTERACTION ---
// 'Z' cycles z slices
// 'T' cycles traversals
function keyPressed() {
    if (key === 'Z' || key === 'z') {
        activeZ = (activeZ + 1) % system.cube.size;
    }

    if (key === 'T' || key === 't') {
        activeTraversal =
            (activeTraversal + 1) %
            system.cube.allTraversals().length;
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
