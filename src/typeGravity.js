import TextFrame from './textFrame.js';
import {
  checkType,
  primitiveType,
  colorToRGB,
  parseIntForPadding,
  parseIntForMargin,
} from './utils.js';

class TypeGravity {
  static FPS = 60;
  static FPS_TIME = 1000 / TypeGravity.FPS;

  #canvasContainer;
  #canvas;
  #ctx;
  #backgroundCanvas = undefined;
  #backgroundCtx;
  #rootElement;
  #elementObj;
  #text;
  #stopEventTimer;
  #textFrame;
  #textFrameMetrics;
  #stageSize;
  #backgroundSize;
  #fontRGB;
  #rootStyle;
  #textCount;
  #imageData;
  #isProcessing = false;
  #isInitialized = false;

  constructor(elementId) {
    checkType(elementId, primitiveType.string);

    this.#elementObj = document.querySelector(`#${elementId}`);
    if (!this.#elementObj) {
      throw new Error("This element id doesn't exit.");
    }

    this.#text = this.#elementObj.innerText;
    this.#rootStyle = window.getComputedStyle(this.#elementObj);
    this.#fontRGB = colorToRGB(this.#rootStyle.color);

    this.#createRootElement();
    setTimeout(() => {
      this.#createCanvases();
      this.#textFrame = new TextFrame(
        this.#ctx,
        this.#rootStyle,
        this.#text,
        this.#fontRGB.a
      );
      this.#textFrameMetrics = this.#textFrame.getMetrics(this.#stageSize);
      this.#textCount = this.#textFrameMetrics.textFields.length;
      this.#isInitialized = true;
    }, 380);

    window.addEventListener('resize', this.#resize);
  }

  start = () => {
    if (!this.#isProcessing) {
      this.#setEventTimer();
      this.#isProcessing = true;
    }
  };

  stop = () => {
    if (this.#isProcessing) {
      this.#stopEventTimer();
      this.#isProcessing = false;
    }
  };

  restart = () => {
    if (this.#isProcessing) {
      this.#stopEventTimer();
    }

    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#imageData = this.#ctx.getImageData(0, 0, this.#stageSize.width, this.#stageSize.height); // prettier-ignore
    this.#isProcessing = true;

    this.#setEventTimer();
  };

  #createRootElement = () => {
    this.#rootElement = document.createElement('div');
    this.#elementObj.parentElement.insertBefore(
      this.#rootElement,
      this.#elementObj
    );
    this.#rootElement.append(this.#elementObj);

    this.#rootElement.style.position = 'relative';
    this.#elementObj.style.transition = 'opacity 300ms ease-out';
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
    this.#canvasContainer.style.transform = this.#rootStyle.transform;
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
    this.#textFrameMetrics = this.#textFrame.getMetrics(this.#stageSize);
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

  #setEventTimer = () => {
    const intervalId = setInterval(() => {
      if (!this.#isInitialized) {
        return;
      }

      if (this.#isDoneEvent) {
        this.#stopEventTimer();
        return;
      }

      this.#eventHandler();
    }, TypeGravity.FPS_TIME);

    this.#stopEventTimer = () => clearInterval(intervalId);
  };

  #getClientSize = (elementObj, paddingWidth = 0, paddingHeight = 0) => {
    return {
      width: Math.round(elementObj.offsetWidth - paddingWidth),
      height: Math.round(elementObj.offsetHeight - paddingHeight),
    };
  };

  #eventHandler = () => {};

  get #isDoneEvent() {
    return true;
  }
}

export default TypeGravity;
