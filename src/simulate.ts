
import * as THREE from "three";


var TIMESTEP = 18 / 1000;
var TIMESTEP_SQ = TIMESTEP * TIMESTEP;

export var MASS = 0.1;
var windForce = new THREE.Vector3(0, 0, 0);

var GRAVITY = 981 * 1.4;
var gravity = new THREE.Vector3(0, -GRAVITY, 0).multiplyScalar(MASS);

export var ballSize = 60; //40
var tmpForce = new THREE.Vector3();

export function simulate(
    now: number,
    params: { enableWind: boolean, showBall: boolean },
    sphere,
    clothGeometry,
    cloth,
    ballPosition: THREE.Vector3, pins) {

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