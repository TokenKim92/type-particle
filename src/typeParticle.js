import TextFrame from './textFrame.js';
import {
  checkType,
  primitiveType,
  colorToRGB,
  parseIntForPadding,
  parseIntForMargin,
  HORIZONTAL,
  VERTICAL,
  LEFT,
  TOP,
  RIGHT,
  BOTTOM,
  ALL_SIDE,
} from './utils.js';

class TypeParticle {
  static FPS = 60;
  static OPACITY_TRANSITION_TIME = 300;

  #canvasContainer;
  #canvas;
  #ctx;
  #backgroundCanvas = undefined;
  #backgroundCtx;
  #rootElement;
  #elementObj;
  #text;
  #textFrame;
  #particles = [];
  #imageData;
  #stageSize;
  #backgroundSize;
  #rootStyle;
  #fontRGB;
  #isProcessing = false;
  #isInitialized = false;
  #spreadOption;

  constructor(elementId, spreadSpeed = 10, spreadMode = 'all-side') {
    this.#typeCheck(elementId, spreadSpeed, spreadMode);

    this.#text = this.#elementObj.innerText;
    this.#rootStyle = window.getComputedStyle(this.#elementObj);
    this.#fontRGB = colorToRGB(this.#rootStyle.color);
    this.#spreadOption = {
      speed: spreadSpeed > 100 ? 100 : spreadSpeed,
      mode: this.#parseIntSpreadMode(spreadMode),
      alpha: this.#fontRGB.a,
    };

    this.#createRootElement();

    setTimeout(() => {
      this.#createCanvases();

      this.#textFrame = new TextFrame(
        this.#ctx,
        this.#rootStyle,
        this.#text,
        this.#spreadOption
      );

      const stageRect = {
        x: 0,
        y: 0,
        width: this.#stageSize.width,
        height: this.#stageSize.height,
      };
      this.#particles = this.#textFrame.getParticles(stageRect);
      this.#ctx.fillStyle = this.#rootStyle.color;
      this.#isInitialized = true;
    }, TypeParticle.OPACITY_TRANSITION_TIME * 1.1);

    window.addEventListener('resize', this.#resize);
  }

  start = () => {
    if (!this.#isInitialized) {
      setTimeout(() => this.start(), TypeParticle.OPACITY_TRANSITION_TIME);

      return;
    }

    if (!this.#isProcessing) {
      this.#isProcessing = true;
      requestAnimationFrame(this.#draw);
    }
  };

  stop = () => {
    if (this.#isProcessing) {
      this.#isProcessing = false;
    }
  };

  restart = () => {
    if (!this.#isInitialized) {
      setTimeout(() => this.start(), TypeFill.OPACITY_TRANSITION_TIME);

      return;
    }

    this.#particles.forEach((particle) => particle.reset());

    if (!this.#isProcessing) {
      this.#isProcessing = true;
      requestAnimationFrame(this.#draw);
    }
  };

  #typeCheck(elementId, spreadSpeed, spreadMode) {
    checkType(elementId, primitiveType.string);
    checkType(spreadSpeed, primitiveType.number);
    checkType(spreadMode, primitiveType.string);

    this.#elementObj = document.querySelector(`#${elementId}`);
    if (!this.#elementObj) {
      throw new Error("This element id doesn't exit.");
    }

    if (spreadSpeed <= 0) {
      throw new Error("'spreadSpeed' should be greater then 0.");
    } else if (spreadSpeed > 100) {
      console.warn("The max speed for 'spreadSpeed' is 100.");
    }
  }

  #createRootElement = () => {
    this.#rootElement = document.createElement('div');
    this.#elementObj.parentElement.insertBefore(
      this.#rootElement,
      this.#elementObj
    );
    this.#rootElement.append(this.#elementObj);

    this.#rootElement.style.position = 'relative';
    this.#elementObj.style.transition = `opacity ${TypeParticle.OPACITY_TRANSITION_TIME}ms ease-out`;
    setTimeout(() => {
      this.#elementObj.style.opacity = 0;
    }, 1);
  };

  #createCanvases = () => {
    const padding = parseIntForPadding(this.#rootStyle.padding);
    const margin = parseIntForMargin(this.#rootStyle.margin);
    const toBeCreatedBackground =
      colorToRGB(this.#rootStyle.backgroundColor).a !== 0;
    this.#backgroundSize = this.#getClientSize(this.#elementObj);

    this.#canvasContainer = document.createElement('div');
    this.#canvasContainer.style.transform =
      this.#rootStyle.display !== 'inline'
        ? this.#rootStyle.transform
        : 'matrix(1, 0, 0, 1, 0, 0)';
    this.#canvasContainer.style.top = `-${
      this.#backgroundSize.height + margin.top + margin.bottom
    }px`;
    this.#canvasContainer.style.position = 'relative';

    if (toBeCreatedBackground) {
      this.#backgroundCanvas = document.createElement('canvas');
      this.#backgroundCtx = this.#backgroundCanvas.getContext('2d');
      this.#backgroundCanvas.style.cssText = `
        left: ${margin.left}px;
        top: ${margin.top}px;
      `;
      this.#resetBackground();
      this.#backgroundCanvas.style.position = 'absolute';
      this.#canvasContainer.append(this.#backgroundCanvas);
    }

    this.#canvas = document.createElement('canvas');
    this.#ctx = this.#canvas.getContext('2d', { willReadFrequently: true });
    this.#canvas.style.top = `${padding.top + margin.top}px`;
    this.#canvas.style.position = 'absolute';
    this.#resetStage(padding, margin);

    this.#canvasContainer.append(this.#canvas);
    this.#rootElement.append(this.#canvasContainer);
  };

  #resize = () => {
    const newBackgroundSize = this.#getClientSize(this.#elementObj);
    const isResized = newBackgroundSize.height !== this.#backgroundSize.height;
    const gap = newBackgroundSize.width - this.#backgroundSize.width;

    this.#backgroundSize = newBackgroundSize;
    this.#backgroundCanvas && this.#resetBackground();

    if (!isResized) {
      const adjustedGap =
        this.#rootStyle.textAlign === 'center' ? gap / 2 : gap;

      if (this.#rootStyle.textAlign === 'end' || this.#rootStyle.textAlign === 'center') {
        const prevLeft = parseInt(this.#canvas.style.left);
        this.#canvas.style.left = `${prevLeft + adjustedGap}px`;
      } // prettier-ignore

      return;
    }

    const padding = parseIntForPadding(this.#rootStyle.padding);
    const margin = parseIntForMargin(this.#rootStyle.margin);
    this.#canvasContainer.style.top = `-${
      newBackgroundSize.height + margin.top + margin.bottom
    }px`;

    this.#resetStage(padding, margin);
    const stageRect = {
      x: 0,
      y: 0,
      width: this.#stageSize.width,
      height: this.#stageSize.height,
    };
    this.#particles = this.#textFrame.getParticles(stageRect);
    this.restart();
  };

  #resetStage = (padding, margin) => {
    this.#canvas.style.left = `${padding.left + margin.left}px`;

    this.#stageSize = this.#getClientSize(
      this.#elementObj,
      padding.left + padding.right,
      padding.top + padding.bottom
    );
    this.#canvas.width = this.#stageSize.width;
    this.#canvas.height = this.#stageSize.height;

    this.#imageData = this.#ctx.getImageData(
      0,
      0,
      this.#stageSize.width,
      this.#stageSize.height
    );
  };

  #resetBackground = () => {
    this.#backgroundCanvas.width = this.#backgroundSize.width;
    this.#backgroundCanvas.height = this.#backgroundSize.height;

    this.#backgroundCtx.fillStyle = this.#rootStyle.backgroundColor;
    this.#backgroundCtx.fillRect(
      0,
      0,
      this.#backgroundSize.width,
      this.#backgroundSize.height
    );
  };

  #draw = () => {
    if (this.#isSpreadDone || !this.#isProcessing) {
      this.#isProcessing = false;
      return;
    }

    this.#spreadParticle();

    requestAnimationFrame(this.#draw);
  };

  #spreadParticle = () => {
    this.#clearStage();

    this.#particles.forEach((particle) => {
      particle.update();

      const index =
        Math.round(particle.x) + Math.round(particle.y) * this.#stageSize.width;

      this.#imageData.data[index * 4] = this.#fontRGB.r;
      this.#imageData.data[index * 4 + 1] = this.#fontRGB.g;
      this.#imageData.data[index * 4 + 2] = this.#fontRGB.b;
      this.#imageData.data[index * 4 + 3] = particle.alpha;
    });

    this.#ctx.putImageData(this.#imageData, 0, 0);
  };

  #getClientSize = (elementObj, paddingWidth = 0, paddingHeight = 0) => {
    return {
      width: Math.round(elementObj.offsetWidth - paddingWidth),
      height: Math.round(elementObj.offsetHeight - paddingHeight),
    };
  };

  get #isSpreadDone() {
    return this.#particles[0].isDone;
  }

  #clearStage = () => {
    for (let i = 0; i < this.#imageData.data.length; i++) {
      this.#imageData.data[i] = 0;
    }
  };

  #parseIntSpreadMode = (spreadMode) => {
    switch (spreadMode) {
      case 'horizontal':
        return HORIZONTAL;
      case 'vertical':
        return VERTICAL;
      case 'left':
        return LEFT;
      case 'top':
        return TOP;
      case 'right':
        return RIGHT;
      case 'bottom':
        return BOTTOM;
      case 'all-side':
        return ALL_SIDE;
      default:
        console.warn(
          "Since this spread mode is not valid, 'all-side' is used as the default."
        );
        return ALL_SIDE;
    }
  };
}

export default TypeParticle;
