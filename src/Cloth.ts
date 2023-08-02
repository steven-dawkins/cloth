import { Particle } from "./Particle";
import { MASS } from "./simulate";

export const restDistance = 25;

export function Cloth(w, h) {
    w = w || 10;
    h = h || 10;
    this.w = w;
    this.h = h;
  
    const particles: Array<Particle> = [];
    const constraints: Array<[Particle, Particle, number]> = [];
  
    var u, v;
  
    // Create particles
    for (v = 0; v <= h; v++) {
      for (u = 0; u <= w; u++) {
        //const x = Math.cos(u * 2 * Math.PI /w);
        //const z = Math.sin(u * 2 * Math.PI /w);
        const z = 10;
        const x = u / w
        const y = v / h
        particles.push(new Particle(x, y, z, MASS));
      }
    }
  
    // Structural
  
    for (v = 0; v < h; v++) {
      for (u = 0; u < w; u++) {
        // up
        constraints.push([
          particles[index(u, v)],
          particles[index(u, v + 1)],
          restDistance
        ]);
  
        // right
        constraints.push([
          particles[index(u, v)],
          particles[index(u + 1, v)],
          restDistance
        ]);
      }
    }
  
    // seam 
    for (u = w, v = 0; v < h; v++) {
        // up
      constraints.push([
        particles[index(u, v)],
        particles[index(u, v + 1)],
        restDistance
      ]);

      // right (new)
      constraints.push([
        particles[index(u, v)],
        particles[index(0, v)],
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
  
    function index(u: number, v: number) {
      return u + v * (w + 1);
    }
  
    this.index = index;
  }