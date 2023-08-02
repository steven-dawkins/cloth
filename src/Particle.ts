import * as THREE from "three";
import { restDistance } from "./Cloth";

var DAMPING = 0.03;
var DRAG = 1 - DAMPING;

export const xSegs = 20;
export const ySegs = 10;

export var clothFunction = plane(restDistance * xSegs, restDistance * ySegs);

export class Particle {
  tmp: THREE.Vector3;
  position: THREE.Vector3;
  previous: THREE.Vector3;
  original: THREE.Vector3;
  a: THREE.Vector3;
  mass: number;
  invMass: number;
  tmp2: THREE.Vector3;

  constructor(x: number, y: number, z: number, mass: number) {
    this.position = new THREE.Vector3();
    this.previous = new THREE.Vector3();
    this.original = new THREE.Vector3();
    this.a = new THREE.Vector3(0, 0, 0); // acceleration
    this.mass = mass;
    this.invMass = 1 / mass;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();

    // init
    clothFunction(x, y, this.position); // position
    clothFunction(x, y, this.previous); // previous
    clothFunction(x, y, this.original);
  }

  // Force -> Acceleration
  public addForce(force) {
    this.a.add(this.tmp2.copy(force).multiplyScalar(this.invMass));
  }

  // Performs Verlet integration
  public integrate(timesq: number) {
    var newPos = this.tmp.subVectors(this.position, this.previous);
    newPos.multiplyScalar(DRAG).add(this.position);
    newPos.add(this.a.multiplyScalar(timesq));

    this.tmp = this.previous;
    this.previous = this.position;
    this.position = newPos;

    this.a.set(0, 0, 0);
  }
}



function plane(width: number, height: number) {
  return function (u: number, v: number, target) {
    var x = (u - 0.5) * width;
    var y = (v + 0.5) * height;
    var z = 50;

    x = (Math.sin(u * 2 * Math.PI) - 0.5) * width/2;
    y = (v + 0.5) * height;
    z = (Math.cos(u * 2 * Math.PI) - 0.5) * width/2;

    target.set(x, y, z);
  };
}