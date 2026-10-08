// --- DOM Elements & Accessibility Configuration ---
const canvasElement = document.getElementById('orbit');
const canvasContext = canvasElement.getContext('2d');
const motionToggleButton = document.getElementById('motion');
const prefersReducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');

// --- Constants & Configuration ---
const SPHERE_RINGS = 11;
const SPHERE_COLUMNS = 20;
const CAMERA_DISTANCE = 3.8;
const BASE_ROTATION_SPEED = 0.00016;
const MAX_DELTA_TIME = 40;
const DRAG_SENSITIVITY_X = 0.008;
const DRAG_SENSITIVITY_Y = 0.006;
const PITCH_MIN = -1.0;
const PITCH_MAX = 1.0;

const COLOR_WIRE_BASE = 'rgba(181, 199, 144, ';
const COLOR_HALO_START = '#c7dba00c';
const COLOR_HALO_END = '#c7dba000';
const COLOR_ACCENT_LIGHT = '#b5c790';
const COLOR_ACCENT_WARM = '#e5b79a';

const ORBITAL_RINGS_CONFIG = [
    { scale: [1.58, 0.36, 1.5], stroke: '#e5b79a66', lineWidth: 1.0 },
    { scale: [1.37, 1.30, 0.3], stroke: '#82966b33', lineWidth: 0.6 },
    { scale: [1.12, 1.25, 0.8], stroke: '#82966b33', lineWidth: 0.6 }
];

// --- Application State ---
let isPaused = prefersReducedMotionQuery.matches;
let rotationYaw = 0.35;
let rotationPitch = -0.25;
let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let lastFrameTimestamp = 0;

// --- Geometry Generation ---
function generateSphereGeometry(rings, columns) {
    const points = [];
    const edges = [];

    for (let ring = 0; ring <= rings; ring++) {
        const theta = (Math.PI * ring) / rings;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        for (let col = 0; col < columns; col++) {
            const phi = (2 * Math.PI * (col + (ring % 2) * 0.5)) / columns;
            points.push([
                sinTheta * Math.cos(phi),
                cosTheta,
                sinTheta * Math.sin(phi)
            ]);
        }
    }

    for (let ring = 0; ring < rings; ring++) {
        for (let col = 0; col < columns; col++) {
            const currentIndex = ring * columns + col;
            const nextColIndex = ring * columns + ((col + 1) % columns);
            const nextRingIndex = currentIndex + columns;
            const diagonalIndex = (ring + 1) * columns + ((col + 1) % columns);

            edges.push(
                [currentIndex, nextColIndex],
                [currentIndex, nextRingIndex],
                [currentIndex, diagonalIndex]
            );
        }
    }

    return { points, edges };
}

const sphereGeometry = generateSphereGeometry(SPHERE_RINGS, SPHERE_COLUMNS);

// --- Math & 3D Projections ---
function transform3D([x, y, z]) {
    const cosYaw = Math.cos(rotationYaw);
    const sinYaw = Math.sin(rotationYaw);
    const cosPitch = Math.cos(rotationPitch);
    const sinPitch = Math.sin(rotationPitch);

    const transformedX = x * cosYaw + z * sinYaw;
    const intermediateZ = -x * sinYaw + z * cosYaw;

    const transformedY = y * cosPitch - intermediateZ * sinPitch;
    const transformedZ = y * sinPitch + intermediateZ * cosPitch;

    return [transformedX, transformedY, transformedZ];
}

function projectToScreen(point3D, radius) {
    const [tx, ty, tz] = transform3D(point3D);
    const perspectiveScale = CAMERA_DISTANCE / (CAMERA_DISTANCE - tz);

    const screenX = canvasWidth / 2 + tx * radius * perspectiveScale;
    const screenY = canvasHeight / 2 + ty * radius * perspectiveScale;

    return [screenX, screenY, tz];
}

// --- Rendering Sub-Routines ---
function renderBackgroundHalo(radius) {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const gradient = canvasContext.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius * 1.55
    );

    gradient.addColorStop(0, COLOR_HALO_START);
    gradient.addColorStop(1, COLOR_HALO_END);

    canvasContext.fillStyle = gradient;
    canvasContext.fillRect(0, 0, canvasWidth, canvasHeight);
}

function renderWireframeEdges(projectedPoints) {
    for (const [indexA, indexB] of sphereGeometry.edges) {
        const pointA = projectedPoints[indexA];
        const pointB = projectedPoints[indexB];
        const averageDepth = (pointA[2] + pointB[2]) / 2;
        const alpha = 0.08 + (averageDepth + 1) * 0.17;

        canvasContext.strokeStyle = `${COLOR_WIRE_BASE}${alpha})`;
        canvasContext.lineWidth = 0.7;
        canvasContext.beginPath();
        canvasContext.moveTo(pointA[0], pointA[1]);
        canvasContext.lineTo(pointB[0], pointB[1]);
        canvasContext.stroke();
    }
}

function renderOrbitalRings(radius) {
    const segments = 150;

    for (const ringConfig of ORBITAL_RINGS_CONFIG) {
        const [scaleX, scaleY, scaleZ] = ringConfig.scale;
        canvasContext.beginPath();

        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const point3D = [
                Math.cos(angle) * scaleX,
                Math.sin(angle) * scaleY,
                Math.sin(angle) * scaleZ
            ];
            const [screenX, screenY] = projectToScreen(point3D, radius);

            if (i === 0) {
                canvasContext.moveTo(screenX, screenY);
            } else {
                canvasContext.lineTo(screenX, screenY);
            }
        }

        canvasContext.strokeStyle = ringConfig.stroke;
        canvasContext.lineWidth = ringConfig.lineWidth;
        canvasContext.stroke();
    }
}

function renderSatellites(radius) {
    const satelliteCount = 5;

    for (let i = 0; i < satelliteCount; i++) {
        const angle = (i / satelliteCount) * Math.PI * 2 + rotationYaw * 0.4;
        const position3D = [
            Math.cos(angle) * 1.58,
            Math.sin(angle) * 0.36,
            Math.sin(angle) * 1.5
        ];
        const [screenX, screenY] = projectToScreen(position3D, radius);
        const satelliteColor = i % 2 ? COLOR_ACCENT_LIGHT : COLOR_ACCENT_WARM;
        const satelliteRadius = i === 0 ? 5 : 3;

        canvasContext.fillStyle = satelliteColor;
        canvasContext.shadowColor = satelliteColor;
        canvasContext.shadowBlur = 12;

        canvasContext.beginPath();
        canvasContext.arc(screenX, screenY, satelliteRadius, 0, Math.PI * 2);
        canvasContext.fill();
        canvasContext.shadowBlur = 0;
    }
}

function renderCenterLabel() {
    canvasContext.fillStyle = COLOR_ACCENT_WARM;
    canvasContext.font = '500 18px monospace';
    canvasContext.textAlign = 'center';
    canvasContext.fillText('< / >', canvasWidth / 2, canvasHeight / 2 + 7);
}

function draw() {
    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
    const baseRadius = Math.min(canvasWidth, canvasHeight) * 0.29;
    const projectedPoints = sphereGeometry.points.map(p => projectToScreen(p, baseRadius));

    renderBackgroundHalo(baseRadius);
    renderWireframeEdges(projectedPoints);
    renderOrbitalRings(baseRadius);
    renderSatellites(baseRadius);
    renderCenterLabel();
}

// --- Layout & Resize Handling ---
function handleResize() {
    const boundingRect = canvasElement.getBoundingClientRect();
    canvasWidth = boundingRect.width;
    canvasHeight = boundingRect.height;

    const devicePixelRatioClamped = Math.min(window.devicePixelRatio || 1, 2);
    canvasElement.width = canvasWidth * devicePixelRatioClamped;
    canvasElement.height = canvasHeight * devicePixelRatioClamped;

    canvasContext.setTransform(devicePixelRatioClamped, 0, 0, devicePixelRatioClamped, 0, 0);
    draw();
}

// --- State Synchronization & Accessibility ---
function syncMotionUI() {
    motionToggleButton.textContent = isPaused ? 'Play motion ▷' : 'Pause motion Ⅱ';
    motionToggleButton.setAttribute('aria-pressed', String(isPaused));
}

function handleMotionToggle() {
    isPaused = !isPaused;
    syncMotionUI();
}

function handleReducedMotionChange(event) {
    isPaused = event.matches;
    syncMotionUI();
}

// --- Pointer Interaction Handlers ---
function handlePointerDown(event) {
    isDragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvasElement.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
    if (!isDragging) return;

    const deltaX = event.clientX - lastPointerX;
    const deltaY = event.clientY - lastPointerY;

    rotationYaw += deltaX * DRAG_SENSITIVITY_X;
    rotationPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, rotationPitch + deltaY * DRAG_SENSITIVITY_Y));

    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    draw();
}

function handlePointerRelease() {
    isDragging = false;
}

// --- Animation Loop ---
function animationLoop(timestamp) {
    if (!isPaused && !isDragging && !document.hidden) {
        const elapsedDelta = Math.min(timestamp - lastFrameTimestamp, MAX_DELTA_TIME);
        rotationYaw += elapsedDelta * BASE_ROTATION_SPEED;
        draw();
    }

    lastFrameTimestamp = timestamp;
    requestAnimationFrame(animationLoop);
}

// --- Event Listeners Initialization ---
motionToggleButton.addEventListener('click', handleMotionToggle);
prefersReducedMotionQuery.addEventListener('change', handleReducedMotionChange);

canvasElement.addEventListener('pointerdown', handlePointerDown);
canvasElement.addEventListener('pointermove', handlePointerMove);

for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvasElement.addEventListener(eventName, handlePointerRelease);
}

new ResizeObserver(handleResize).observe(canvasElement);

// --- Bootstrap ---
syncMotionUI();
requestAnimationFrame(animationLoop);