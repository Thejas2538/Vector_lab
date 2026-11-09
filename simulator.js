import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const container = document.getElementById("scene-container");
const statusLabel = document.getElementById("renderStatus");
const cameraReadout = document.getElementById("cameraReadout");
const objectReadout = document.getElementById("objectReadout");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080e19);
scene.fog = new THREE.Fog(0x080e19, 17, 42);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 150);
camera.position.set(8, 7, 9);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
container.appendChild(renderer.domElement);
container.querySelector(".loading-label")?.remove();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minDistance = 3;
controls.maxDistance = 32;
controls.maxPolarAngle = Math.PI * 0.48;
controls.target.set(0, 1, 0);
controls.update();

scene.add(new THREE.HemisphereLight(0xa8d9ff, 0x18243a, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(6, 10, 7);
scene.add(keyLight);
const cyanLight = new THREE.PointLight(0x1dcfff, 24, 22);
cyanLight.position.set(-5, 5, -4);
scene.add(cyanLight);
const blueLight = new THREE.PointLight(0x526cff, 15, 18);
blueLight.position.set(5, 2, 5);
scene.add(blueLight);

const grid = new THREE.GridHelper(16, 32, 0x347ca2, 0x1b3048);
grid.position.y = 0;
scene.add(grid);
const axes = new THREE.AxesHelper(5.5);
scene.add(axes);
const origin = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
origin.position.set(0, 0.04, 0);
scene.add(origin);

const objectMaterial = new THREE.MeshStandardMaterial({
  color: 0x25bfff, metalness: 0.52, roughness: 0.22,
  emissive: 0x062b48, emissiveIntensity: 0.55
});
let objectMesh = null;
let edgeMesh = null;
let currentShape = "cube";
const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 2.25, 0xffd166, 0.36, 0.23);
scene.add(arrow);

const shapeInfo = {
  cube: ["CUBE_01", "Six square faces. A classic primitive for demonstrating position in 3D space."],
  sphere: ["SPHERE_02", "A curved surface made from latitude and longitude segments."],
  cone: ["CONE_03", "A circular base tapering to one vertex; useful for understanding orientation."],
  torus: ["TORUS_04", "A continuous ring-shaped surface with a circular cross-section."],
  octahedron: ["OCTAHEDRON_05", "An eight-faced polyhedron formed from two pyramids joined at their bases."],
  icosahedron: ["ICOSAHEDRON_06", "A twenty-faced polyhedron that approximates a sphere using flat triangular faces."],
  cylinder: ["CYLINDER_07", "A solid with two parallel circular bases and a curved side surface."]
};
function makeGeometry(type) {
  switch (type) {
    case "sphere": return new THREE.SphereGeometry(0.72, 40, 28);
    case "cone": return new THREE.ConeGeometry(0.72, 1.35, 6);
    case "torus": return new THREE.TorusGeometry(0.62, 0.23, 18, 64);
    case "octahedron": return new THREE.OctahedronGeometry(0.9, 0);
    case "icosahedron": return new THREE.IcosahedronGeometry(0.82, 0);
    case "cylinder": return new THREE.CylinderGeometry(0.58, 0.58, 1.3, 32);
    default: return new THREE.BoxGeometry(1.05, 1.05, 1.05);
  }
}
function setShape(type) {
  currentShape = type;
  if (objectMesh) {
    scene.remove(objectMesh);
    objectMesh.geometry.dispose();
  }
  if (edgeMesh) {
    objectMesh?.remove(edgeMesh);
    edgeMesh.geometry.dispose();
    edgeMesh.material.dispose();
    edgeMesh = null;
  }
  const geometry = makeGeometry(type);
  objectMesh = new THREE.Mesh(geometry, objectMaterial);
  objectMesh.position.set(Number(sliders.x.value), Number(sliders.y.value), Number(sliders.z.value));
  scene.add(objectMesh);
  edgeMesh = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xb9f0ff, transparent: true, opacity: 0.78 })
  );
  objectMesh.add(edgeMesh);
  const [name, description] = shapeInfo[type];
  objectReadout.textContent = name;
  document.getElementById("shapeDescription").textContent = description;
  autoFrame();
  updateArrow();
}
const ids = ["x", "y", "z", "dx", "dy", "dz"];
const sliders = Object.fromEntries(ids.map(id => [id, document.getElementById(id + "Slider")]));
const outputs = Object.fromEntries(ids.map(id => [id, document.getElementById(id + "Value")]));
const positionDisplay = document.getElementById("positionDisplay");
const directionDisplay = document.getElementById("directionDisplay");
const positionMagnitude = document.getElementById("positionMagnitude");
const directionMagnitude = document.getElementById("directionMagnitude");
const magnitudeBig = document.getElementById("magnitudeBig");
const velocityBig = document.getElementById("velocityBig");
const explanation = document.getElementById("explanation");
let moving = false;
let motionSpeed = 1.6;
let velocity = 0;

function vectorText(v) { return `(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)})`; }
function readPosition() {
  return new THREE.Vector3(Number(sliders.x.value), Number(sliders.y.value), Number(sliders.z.value));
}
function readDirection() {
  return new THREE.Vector3(Number(sliders.dx.value), Number(sliders.dy.value), Number(sliders.dz.value));
}
function updatePosition() {
  const p = readPosition();
  objectMesh.position.copy(p);
  arrow.position.copy(p);
  ["x", "y", "z"].forEach(k => outputs[k].textContent = Number(sliders[k].value).toFixed(1));
  positionDisplay.textContent = vectorText(p);
  positionMagnitude.textContent = p.length().toFixed(2);
  magnitudeBig.innerHTML = `${p.length().toFixed(2)} <small>UNITS</small>`;
  if (!moving) explanation.textContent = `Active ${shapeInfo[currentShape][0]} is located at ${vectorText(p)}. Its position vector magnitude is ${p.length().toFixed(2)} units from the origin.`;
}
function updateArrow() {
  const d = readDirection();
  ["dx", "dy", "dz"].forEach(k => outputs[k].textContent = Number(sliders[k].value).toFixed(1));
  directionDisplay.textContent = vectorText(d);
  directionMagnitude.textContent = d.length().toFixed(2);
  arrow.position.copy(objectMesh.position);
  if (d.lengthSq() > 0.0001) {
    arrow.visible = true;
    arrow.setDirection(d.clone().normalize());
    arrow.setLength(2.25, 0.36, 0.23);
    if (!moving) explanation.textContent = `The amber arrow displays direction ${vectorText(d)}. Its direction is normalized for a consistent visual length.`;
  } else {
    arrow.visible = false;
    if (!moving) explanation.textContent = "The direction vector is (0, 0, 0). A zero vector has no defined direction, so the arrow is hidden.";
  }
}
ids.slice(0, 3).forEach(id => sliders[id].addEventListener("input", updatePosition));
ids.slice(3).forEach(id => sliders[id].addEventListener("input", updateArrow));
document.getElementById("shapeSelect").addEventListener("change", event => setShape(event.target.value));

function autoFrame() {
  if (!objectMesh) return;
  const bounds = new THREE.Box3().setFromObject(objectMesh);
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(sphere.radius, 0.6);
  const target = objectMesh.position.clone();
  const fov = THREE.MathUtils.degToRad(camera.fov);
  let distance = (radius / Math.sin(fov / 2)) * 1.55;
  const aspect = container.clientWidth / Math.max(container.clientHeight, 1);
  if (aspect < 1) distance *= 1.25;
  const viewDirection = new THREE.Vector3(1, 0.78, 1).normalize();
  camera.position.copy(target).addScaledVector(viewDirection, distance);
  camera.near = Math.max(0.05, distance / 100);
  camera.far = Math.max(100, distance * 20);
  camera.updateProjectionMatrix();
  controls.target.copy(target);
  controls.minDistance = radius * 2.2;
  controls.maxDistance = radius * 24;
  controls.update();
  cameraReadout.textContent = "AUTO-FIT / ADAPTIVE";
}
document.getElementById("autoFrame").addEventListener("click", autoFrame);

function resize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  // Keep the active object framed when the viewport aspect ratio changes.
  autoFrame();
}
window.addEventListener("resize", resize);

document.getElementById("toggleMotion").addEventListener("click", event => {
  moving = !moving;
  event.currentTarget.textContent = moving ? "Ⅱ PAUSE MOTION" : "▶ RUN MOTION";
  if (!moving) {
    velocity = 0;
    velocityBig.innerHTML = '0.00 <small>UNITS/S</small>';
  }
});
document.getElementById("resetAll").addEventListener("click", () => {
  const defaults = { x: 0, y: 1, z: 0, dx: 1, dy: 0, dz: 0 };
  Object.entries(defaults).forEach(([key, value]) => sliders[key].value = value);
  moving = false;
  document.getElementById("toggleMotion").textContent = "▶ RUN MOTION";
  updatePosition();
  updateArrow();
  autoFrame();
  velocityBig.innerHTML = '0.00 <small>UNITS/S</small>';
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  if (moving) {
    const direction = readDirection();
    if (direction.lengthSq() > 0.0001) {
      direction.normalize();
      objectMesh.position.addScaledVector(direction, motionSpeed * dt);
      objectMesh.position.x = THREE.MathUtils.clamp(objectMesh.position.x, -5, 5);
      objectMesh.position.y = THREE.MathUtils.clamp(objectMesh.position.y, 0, 5);
      objectMesh.position.z = THREE.MathUtils.clamp(objectMesh.position.z, -5, 5);
      arrow.position.copy(objectMesh.position);
      sliders.x.value = objectMesh.position.x;
      sliders.y.value = objectMesh.position.y;
      sliders.z.value = objectMesh.position.z;
      ["x", "y", "z"].forEach(k => outputs[k].textContent = Number(sliders[k].value).toFixed(1));
      positionDisplay.textContent = vectorText(objectMesh.position);
      positionMagnitude.textContent = objectMesh.position.length().toFixed(2);
      magnitudeBig.innerHTML = `${objectMesh.position.length().toFixed(2)} <small>UNITS</small>`;
      velocity = motionSpeed;
      velocityBig.innerHTML = `${velocity.toFixed(2)} <small>UNITS/S</small>`;
      explanation.textContent = `The ${shapeInfo[currentShape][0]} is moving along the normalized direction ${vectorText(direction)} at ${motionSpeed.toFixed(2)} units per second.`;
    } else {
      velocity = 0;
      velocityBig.innerHTML = '0.00 <small>UNITS/S</small>';
    }
  }
  controls.update();
  renderer.render(scene, camera);
}

setShape("cube");
updatePosition();
updateArrow();
resize();
statusLabel.textContent = "WEBGL / ONLINE";
animate();
