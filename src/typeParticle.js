import BaseType from './BaseType.js';
import Particle from './particle.js';
import { checkType, primitiveType } from './utils.js';

export default class TypeParticle extends BaseType {
  #particles = [];
  #spreadEase;
  #handleSpread;

  constructor(elementId, spreadSpeed = 10, spreadMode = 'all-side') {
    super(elementId);

    this.#typeCheck(spreadSpeed, spreadMode);

    this.#spreadEase = spreadSpeed > 100 ? 1 : spreadSpeed / 100;
    this.#handleSpread = this.#getSpreadHandler(spreadMode);

    this.#initParticles();
  }

  #typeCheck = (spreadSpeed, spreadMode) => {
    checkType(spreadSpeed, primitiveType.number);
    checkType(spreadMode, primitiveType.string);

    if (spreadSpeed <= 0) {
      throw new Error("'spreadSpeed' should be greater then 0.");
    } else if (spreadSpeed > 100) {
      console.warn("The max speed for 'spreadSpeed' is 100.");
    }
  };

  #initParticles = () => {
    const particles = [];

    this.getPixelInfosList(this.canvasSize).forEach((pixelInfos) => {
      pixelInfos.forEach(({ x, y, alpha }) =>
        particles.push(
          new Particle(
            { x, y },
            this.#handleSpread(x, y),
            alpha,
            this.#spreadEase
          )
        )
      );
    });

    this.#particles = particles;
  };

  onRestart = () => {
    this.#particles.forEach((particle) => particle.reset());
  };

  onResize = this.#initParticles;

  onDraw = () => {
    this.stageFill(0);

    this.#particles.forEach((particle) => {
      particle.update();
      const index =
        Math.round(particle.x) + Math.round(particle.y) * this.canvasSize.width;
      this.setPixelOnStage(index, particle.alpha);
    });

    this.stageDraw();
  };

  onDrawFinish = () => {
    this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    this.drawText();
  };

  isDrawFinished = () => {
    return this.#particles[0].isDone;
  };

  #getSpreadHandler(spreadMode) {
    switch (spreadMode) {
      case 'horizontal':
        return (x, y) => ({
          x: Math.random() * this.fittedRect.width + this.fittedRect.x,
          y,
        });
      case 'vertical':
        return (x, y) => ({
          x,
          y: Math.random() * this.fittedRect.height + this.fittedRect.y,
        });
      case 'left':
        return (x, y) => ({
          x: 0,
          y: Math.random() * this.fittedRect.height + this.fittedRect.y,
        });
      case 'top':
        return (x, y) => ({
          x: Math.random() * this.fittedRect.width + this.fittedRect.x,
          y: 0,
        });
      case 'right':
        return (x, y) => ({
          x: this.fittedRect.width + this.fittedRect.x,
          y: Math.random() * this.fittedRect.height + this.fittedRect.y,
        });
      case 'bottom':
        return (x, y) => ({
          x: Math.random() * this.fittedRect.width + this.fittedRect.x,
          y: this.fittedRect.height + this.fittedRect.y,
        });
      case 'all-side':
        return (x, y) => ({
          x: Math.random() * this.fittedRect.width + this.fittedRect.x,
          y: Math.random() * this.fittedRect.height + this.fittedRect.y,
        });
      default:
        console.warn(
          "Since this spread mode is not valid, 'all-side' is used as the default."
        );
        return (x, y) => ({
          x: Math.random() * this.fittedRect.width + this.fittedRect.x,
          y: Math.random() * this.fittedRect.height + this.fittedRect.y,
        });
    }
  }
}
