export default class Particle {
  #orgX;
  #orgY;
  #spreadX;
  #spreadY;
  #ease;
  #offsetDone = 100;

  constructor(orgPos, spreadPos, alpha, ease) {
    this.#orgX = orgPos.x;
    this.#orgY = orgPos.y;
    this.#spreadX = spreadPos.x;
    this.#spreadY = spreadPos.y;
    this.#ease = ease;
    this.alpha = alpha;

    this.reset();
  }

  reset() {
    this.x = this.#spreadX;
    this.y = this.#spreadY;
  }

  update() {
    this.x += (this.#orgX - this.x) * this.#ease;
    this.y += (this.#orgY - this.y) * this.#ease;
  }

  get isDone() {
    return (
      Math.round(this.x * this.#offsetDone) ===
        Math.round(this.#orgX * this.#offsetDone) &&
      Math.round(this.y * this.#offsetDone) ===
        Math.round(this.#orgY * this.#offsetDone)
    );
  }
}
