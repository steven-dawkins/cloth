import "./styles.css";
import * as THREE from "three";
import { ParametricGeometry } from './ParametricGeometry';

import Stats from "three/examples/jsm/libs/stats.module";
// import { GUI } from "three/examples/jsm/libs/dat.gui.module";
// import { GUI } from 'dat.gui'

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Particle } from "./Particle";

/*
 * Cloth Simulation using a relaxed constraints solver
 */

// Suggested Readings

// Advanced Character Physics by Thomas Jakobsen Character
// http://freespace.virgin.net/hugo.elias/models/m_cloth.htm
// http://en.wikipedia.org/wiki/Cloth_modeling
// http://cg.alexandra.dk/tag/spring-mass-system/
// Real-time Cloth Animation http://www.darwin3d.com/gamedev/articles/col0599.pdf

var params = {
  enableWind: false,
  showBall: false,
  togglePins: togglePins
};

var DAMPING = 0.03;
export var DRAG = 1 - DAMPING;
var MASS = 0.1;
var restDistance = 25;

var xSegs = 20;
var ySegs = 10;

export var clothFunction = plane(restDistance * xSegs, restDistance * ySegs);

var cloth = new Cloth(xSegs, ySegs);

var GRAVITY = 981 * 1.4;
var gravity = new THREE.Vector3(0, -GRAVITY, 0).multiplyScalar(MASS);

var TIMESTEP = 18 / 1000;
var TIMESTEP_SQ = TIMESTEP * TIMESTEP;

let pins: Array<number> = [];

var windForce = new THREE.Vector3(0, 0, 0);

var ballPosition = new THREE.Vector3(0, -45, 0);
var ballSize = 60; //40

var tmpForce = new THREE.Vector3();

function plane(width, height) {
  return function (u, v, target) {
    var x = (u - 0.5) * width;
    var y = (v + 0.5) * height;
    var z = 0;

    target.set(x, y, z);
  };
}

var diff = new THREE.Vector3();

function satisfyConstraints(p1, p2, distance) {
  diff.subVectors(p2.position, p1.position);
  var currentDist = diff.length();
  if (currentDist === 0) return; // prevents division by 0
  var correction = diff.multiplyScalar(1 - distance / currentDist);
  var correctionHalf = correction.multiplyScalar(0.5);
  p1.position.add(correctionHalf);
  p2.position.sub(correctionHalf);
}

function Cloth(w, h) {
  w = w || 10;
  h = h || 10;
  this.w = w;
  this.h = h;

  var particles: Array<Particle> = [];
  var constraints: Array<Array<Particle | number>> = [];

  var u, v;

  // Create particles
  for (v = 0; v <= h; v++) {
    for (u = 0; u <= w; u++) {
      particles.push(new Particle(u / w, v / h, 0, MASS));
    }
  }

  // Structural

  for (v = 0; v < h; v++) {
    for (u = 0; u < w; u++) {
      constraints.push([
        particles[index(u, v)],
        particles[index(u, v + 1)],
        restDistance
      ]);

      constraints.push([
        particles[index(u, v)],
        particles[index(u + 1, v)],
        restDistance
      ]);
    }
  }

  for (u = w, v = 0; v < h; v++) {
    constraints.push([
      particles[index(u, v)],
      particles[index(u, v + 1)],
      restDistance
    ]);
  }

  for (v = h, u = 0; u < w; u++) {
    constraints.push([
      particles[index(u, v)],
      particles[index(u + 1, v)],
      restDistance
    ]);
  }

  // While many systems use shear and bend springs,
  // the relaxed constraints model seems to be just fine
  // using structural springs.
  // Shear
  // var diagonalDist = Math.sqrt(restDistance * restDistance * 2);

  // for (v=0;v<h;v++) {
  // 	for (u=0;u<w;u++) {

  // 		constraints.push([
  // 			particles[index(u, v)],
  // 			particles[index(u+1, v+1)],
  // 			diagonalDist
  // 		]);

  // 		constraints.push([
  // 			particles[index(u+1, v)],
  // 			particles[index(u, v+1)],
  // 			diagonalDist
  // 		]);

  // 	}
  // }

  this.particles = particles;
  this.constraints = constraints;

  function index(u, v) {
    return u + v * (w + 1);
  }

  this.index = index;
}

function simulate(now) {
  var windStrength = Math.cos(now / 7000) * 20 + 40;

  windForce.set(
    Math.sin(now / 2000),
    Math.cos(now / 3000),
    Math.sin(now / 1000)
  );
  windForce.normalize();
  windForce.multiplyScalar(windStrength);

  var i, j, il, particles, particle, constraints, constraint;

  // Aerodynamics forces

  if (params.enableWind) {
    var indx;
    var normal = new THREE.Vector3();
    var indices = clothGeometry.index;
    var normals = clothGeometry.attributes.normal;

    particles = cloth.particles;

    for (i = 0, il = indices.count; i < il; i += 3) {
      for (j = 0; j < 3; j++) {
        indx = indices.getX(i + j);
        normal.fromBufferAttribute(normals, indx);
        tmpForce.copy(normal).normalize().multiplyScalar(normal.dot(windForce));
        particles[indx].addForce(tmpForce);
      }
    }
  }

  for (particles = cloth.particles, i = 0, il = particles.length; i < il; i++) {
    particle = particles[i];
    particle.addForce(gravity);

    particle.integrate(TIMESTEP_SQ);
  }

  // Start Constraints

  constraints = cloth.constraints;
  il = constraints.length;

  for (i = 0; i < il; i++) {
    constraint = constraints[i];
    satisfyConstraints(constraint[0], constraint[1], constraint[2]);
  }

  // Ball Constraints

  ballPosition.z = -Math.sin(now / 600) * 90; //+ 40;
  ballPosition.x = Math.cos(now / 400) * 70;

  if (params.showBall) {
    sphere.visible = true;

    for (
      particles = cloth.particles, i = 0, il = particles.length;
      i < il;
      i++
    ) {
      particle = particles[i];
      var pos = particle.position;
      diff.subVectors(pos, ballPosition);
      if (diff.length() < ballSize) {
        // collided
        diff.normalize().multiplyScalar(ballSize);
        pos.copy(ballPosition).add(diff);
      }
    }
  } else {
    sphere.visible = false;
  }

  // Floor Constraints

  for (particles = cloth.particles, i = 0, il = particles.length; i < il; i++) {
    particle = particles[i];
    pos = particle.position;
    if (pos.y < -250) {
      pos.y = -250;
    }
  }

  // Pin Constraints

  for (i = 0, il = pins.length; i < il; i++) {
    var xy = pins[i];
    var p = particles[xy];
    p.position.copy(p.original);
    p.previous.copy(p.original);
  }
}

/* testing cloth simulation */

var pinsFormation: Array<Array<number>> = [];
pins = [6];

pinsFormation.push(pins);

pins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
pinsFormation.push(pins);

pins = [0];
pinsFormation.push(pins);

pins = []; // cut the rope ;)
pinsFormation.push(pins);

pins = [0, cloth.w]; // classic 2 pins
pinsFormation.push(pins);

pins = pinsFormation[1];

function togglePins() {
  pins = pinsFormation[~~(Math.random() * pinsFormation.length)];
}

var container, stats;
var camera, scene, renderer;

var clothGeometry;
var sphere;
var object;

init();
animate(0);

function init() {
  container = document.createElement("div");
  document.body.appendChild(container);

  // scene

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  // scene.fog = new THREE.Fog(0xcce0ff, 500, 10000);

  // camera

  camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(1000, 50, 1500);

  // lights

  scene.add(new THREE.AmbientLight(0x666666));

  var light = new THREE.DirectionalLight(0xdfebff, 1);
  light.position.set(50, 200, 100);
  light.position.multiplyScalar(1.3);

  light.castShadow = true;

  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;

  var d = 300;

  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;

  light.shadow.camera.far = 1000;

  scene.add(light);

  // cloth material

  var loader = new THREE.TextureLoader();
  var clothTexture = loader.load(require("./textures/grid.png"));
  clothTexture.anisotropy = 16;

  var clothMaterial = new THREE.MeshLambertMaterial({
    map: clothTexture,
    side: THREE.DoubleSide,
    alphaTest: 0.5
  });

  // cloth geometry

  clothGeometry = new ParametricGeometry(
    clothFunction,
    cloth.w,
    cloth.h
  );

  // cloth mesh

  object = new THREE.Mesh(clothGeometry, clothMaterial);
  object.position.set(0, 0, 0);
  object.castShadow = true;
  scene.add(object);

  object.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: clothTexture,
    alphaTest: 0.5
  });

  // sphere

  var ballGeo = new THREE.SphereGeometry(ballSize, 32, 16);
  var ballMaterial = new THREE.MeshLambertMaterial();

  sphere = new THREE.Mesh(ballGeo, ballMaterial);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  sphere.visible = false;
  scene.add(sphere);

  // ground

  var groundTexture = loader.load(require("./textures/grasslight-big.jpg"));
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(25, 25);
  groundTexture.anisotropy = 16;
  groundTexture.encoding = THREE.sRGBEncoding;

  var groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });

  {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    groundMaterial
  );
  mesh.position.y = -250;
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

  // poles

  var poleGeo = new THREE.BoxGeometry(5, 375, 5);
  var poleMat = new THREE.MeshLambertMaterial();

  {
    const mesh = new THREE.Mesh(poleGeo, poleMat);
  mesh.position.x = -125 * xSegs / 10;
  mesh.position.y = -62;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  }

  {
    const mesh = new THREE.Mesh(poleGeo, poleMat);
  mesh.position.x = 125 * xSegs / 10;
  mesh.position.y = -62;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  }

  var mesh = new THREE.Mesh(new THREE.BoxGeometry(255 * xSegs / 10, 5, 5), poleMat);
  mesh.position.y = -250 + 750 / 2;
  mesh.position.x = 0;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);

  var gg = new THREE.BoxGeometry(10, 10, 10);
  var mesh = new THREE.Mesh(gg, poleMat);
  mesh.position.y = -250;
  mesh.position.x = 125 * xSegs / 10;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);

  var mesh = new THREE.Mesh(gg, poleMat);
  mesh.position.y = -250;
  mesh.position.x = -125 * xSegs / 10;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);

  // renderer

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  container.appendChild(renderer.domElement);

  renderer.outputEncoding = THREE.sRGBEncoding;

  renderer.shadowMap.enabled = true;

  // controls
  var controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.5;
  controls.minDistance = 1000;
  controls.maxDistance = 5000;

  // performance monitor

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  window.addEventListener("resize", onWindowResize, false);

  //

  // var gui = new GUI();
  // gui.add(params, "enableWind").name("Enable wind");
  // gui.add(params, "showBall").name("Show ball");
  // gui.add(params, "togglePins").name("Toggle pins");
  //

  // if (typeof TESTING !== "undefined") {
  //   for (var i = 0; i < 50; i++) {
  //     simulate(500 - 10 * i);
  //   }
  // }
}

//

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate(now) {
  requestAnimationFrame(animate);
  simulate(now);
  render();
  stats.update();
}

function render() {
  var p = cloth.particles;

  for (var i = 0, il = p.length; i < il; i++) {
    var v = p[i].position;

    clothGeometry.attributes.position.setXYZ(i, v.x, v.y, v.z);
  }

  clothGeometry.attributes.position.needsUpdate = true;

  clothGeometry.computeVertexNormals();

  sphere.position.copy(ballPosition);

  renderer.render(scene, camera);
}