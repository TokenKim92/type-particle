export default class Particle {
  static FRICTION = 0.86;

  #orgPos;
  #pos;
  #posVelocity;

  constructor(orgPos) {
    this.#orgPos = orgPos;
    this.reset();
  }

  reset() {
    this.#pos = {
      x: this.#orgPos.x,
      y: this.#orgPos.y,
    };

    this.#posVelocity = {
      vx: 0,
      vy: 0,
    };
  }

  collide() {
    this.#posVelocity.vx *= Particle.FRICTION;
    this.#posVelocity.vy *= Particle.FRICTION;

    this.#pos.x += this.#posVelocity.vx;
    this.#pos.y += this.#posVelocity.vy;
  }

  get posVelocity() {
    return this.#posVelocity;
  }

  set posVelocity(posVelocity) {
    this.#posVelocity = posVelocity;
  }

  get pos() {
    return this.#pos;
  }
}
