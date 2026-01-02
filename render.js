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

    // --- DRAW CURRENT Z SLICE ---
    drawCubeSlice(system.cube, activeZ);

    // --- HIGHLIGHT CURRENT TRAVERSAL ---
    highlightTraversal(system.cube.allTraversals()[activeTraversal]);

    // --- DEBUG INFO ---
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

// draw one z-slice with Saturn load and Jupiter expansion
function drawCubeSlice(cube, z) {
    const scale = min(width, height) / cube.size;

    cube.nodes
        .filter(n => n.z === z)
        .forEac
