import {
  checkType,
  primitiveType,
  colorToRGB,
  parseIntForPadding,
  parseIntForMargin,
} from './utils.js';
import TextFrame from './TextFrame.js';

export default class BaseType {
  static FPS = 60;
  static FPS_TIME = (1000 / BaseType.FPS) | 0;
  static OPACITY_TRANSITION_TIME = 300;

  /* Private member */
  #textFrame;
  #rootElement;
  #previousTime = 0;
  #elementObj;
  #canvasContainer;
  #canvas;
  #backgroundCanvas;
  #backgroundCtx;
  #backgroundSize;
  #fontRGB;
  #rootStyle;
  #imageData;
  #isInitialized = false;
  #isProcessing = false;
  #particleSortMode;

  /* Public member as protect*/
  ctx;
  canvasSize;

  /* Interface functions */
  onRestart = undefined;
  onResize = undefined;
  onDraw = undefined;
  onDrawFinish = undefined;
  isDrawFinished = undefined;

  constructor(elementId, particleSortMode = 'field') {
    checkType(elementId, primitiveType.string);

    this.#elementObj = document.querySelector(`#${elementId}`);
    if (!this.#elementObj) {
      throw new Error("This element id doesn't exit.");
    }

    this.#particleSortMode = particleSortMode;
    this.#rootStyle = window.getComputedStyle(this.#elementObj);
    this.#fontRGB = colorToRGB(this.#rootStyle.color);

    this.#createRootElement();
    this.#createCanvases();
    this.#textFrame = new TextFrame(
      this.ctx,
      {
        rootStyle: this.#rootStyle,
        alphaValue: this.#fontRGB.a,
      },
      this.#elementObj.innerText,
      particleSortMode
    );

    this.#resetStage();
    window.addEventListener('resize', this.#resize);
    // to start animation after the previous text is disappeared
    setTimeout(
      () => (this.#isInitialized = true),
      BaseType.OPACITY_TRANSITION_TIME * 1.1
    );
  }

  get fittedRect() {
    return { ...this.#textFrame.getFittedRect() };
  }

  get rootStyle() {
    return window.getComputedStyle(this.#elementObj);
  }

  stageFill = (value, start = 0, end = this.#imageData.data.length) => {
    this.#imageData.data.fill(value, start, end);
  };

  stageDraw = () => {
    this.ctx.putImageData(this.#imageData, 0, 0);
  };

  setPixelOnStage = (index, alpha) => {
    this.#imageData.data[index * 4] = this.#fontRGB.r;
    this.#imageData.data[index * 4 + 1] = this.#fontRGB.g;
    this.#imageData.data[index * 4 + 2] = this.#fontRGB.b;
    this.#imageData.data[index * 4 + 3] = alpha;
  };

  getPixelInfosList = (stageSize) => {
    const pixelInfosList = this.#textFrame.getMetrics(stageSize).pixelInfosList;

    switch (this.#particleSortMode) {
      case 'position':
        const pixelInfosKeys = Object.keys(pixelInfosList.mainList).map((x) =>
          parseInt(x)
        );
        const copiedPixelHeightsList = new Array();
        const copiedPixelAlphasList = new Array();

        pixelInfosKeys.forEach((key) => {
          copiedPixelHeightsList[key] = [...pixelInfosList.mainList[key]];
          copiedPixelAlphasList[key] = [...pixelInfosList.secondList[key]];
        });

        return {
          heightsList: copiedPixelHeightsList,
          alphasList: copiedPixelAlphasList,
        };

      case 'field':
      default:
        const copiedPixelInfosList = new Array();
        pixelInfosList.mainList.forEach((pixelInfos, index) => {
          copiedPixelInfosList.push(new Array());

          pixelInfos.forEach((pixelInfo) => {
            copiedPixelInfosList[index].push({ ...pixelInfo });
          });
        });

        return copiedPixelInfosList;
    }
  };

  getTextFields = (stageSize) => {
    return this.#textFrame.getMetrics(stageSize).textFields;
  };

  drawText = () => {
    this.#textFrame.drawText();
  };

  start = () => {
    if (!this.#isInitialized) {
      setTimeout(() => this.start(), BaseType.OPACITY_TRANSITION_TIME);

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
      setTimeout(() => this.start(), BaseType.OPACITY_TRANSITION_TIME);

      return;
    }

    this.#imageData.data.fill(0);
    this.ctx.putImageData(this.#imageData, 0, 0);

    this.onRestart();

    if (!this.#isProcessing) {
      this.#isProcessing = true;
      requestAnimationFrame(this.#draw);
    }
  };

  #createRootElement = () => {
    this.#rootElement = document.createElement('div');
    this.#elementObj.parentElement.insertBefore(
      this.#rootElement,
      this.#elementObj
    );
    this.#rootElement.append(this.#elementObj);

    this.#rootElement.style.position = 'relative';
    this.#elementObj.style.transition = `opacity ${BaseType.OPACITY_TRANSITION_TIME}ms ease-out`;
    setTimeout(() => {
      this.#elementObj.style.opacity = 0;
    }, 1);
  };

  #createCanvases = () => {
    const createCanvasContainer = () => {
      this.#canvasContainer = document.createElement('div');
      this.#canvasContainer.style.transform =
        this.#rootStyle.display !== 'inline'
          ? this.#rootStyle.transform
          : 'matrix(1, 0, 0, 1, 0, 0)';
      this.#canvasContainer.style.top = `-${
        this.#backgroundSize.height + margin.top + margin.bottom
      }px`;
      this.#canvasContainer.style.position = 'relative';
    };

    const createBackgroundCanvas = () => {
      this.#backgroundCanvas = document.createElement('canvas');
      this.#backgroundCtx = this.#backgroundCanvas.getContext('2d');
      this.#backgroundCanvas.style.left = `${margin.left}px`;
      this.#backgroundCanvas.style.top = `${margin.top}px`;
      this.#resetBackground();
      this.#backgroundCanvas.style.position = 'absolute';
    };

    const createCanvas = () => {
      this.#canvas = document.createElement('canvas');
      this.ctx = this.#canvas.getContext('2d', { willReadFrequently: true });
      this.#canvas.style.position = 'absolute';
      this.#canvas.style.top = `${padding.top + margin.top}px`;
    };

    const padding = parseIntForPadding(this.#rootStyle.padding);
    const margin = parseIntForMargin(this.#rootStyle.margin);
    const toBeCreatedBackground =
      colorToRGB(this.#rootStyle.backgroundColor).a !== 0;
    this.#backgroundSize = this.#getClientSize(this.#elementObj);

    createCanvasContainer();
    if (toBeCreatedBackground) {
      createBackgroundCanvas();
      this.#canvasContainer.append(this.#backgroundCanvas);
    }
    createCanvas();
    this.#canvasContainer.append(this.#canvas);
    this.#rootElement.append(this.#canvasContainer);
  };

  #resetStage = () => {
    const clientSize = this.#getClientSize(this.#elementObj);
    const textFrameRect = this.#textFrame.getFittedRect(clientSize);

    this.#canvas.style.left = `${textFrameRect.x}px`;
    this.#canvas.width = textFrameRect.width;
    this.#canvas.height = clientSize.height;
    this.ctx.fillStyle = this.#rootStyle.color;

    this.canvasSize = {
      width: this.#canvas.width,
      height: this.#canvas.height,
    };

    this.#imageData = this.ctx.getImageData(
      0,
      0,
      this.#canvas.width,
      this.#canvas.height
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

    const margin = parseIntForMargin(this.#rootStyle.margin);
    const padding = parseIntForMargin(this.#rootStyle.padding);
    const toBeCreatedBackground =
      colorToRGB(this.#rootStyle.backgroundColor).a !== 0;

    this.#canvasContainer.style.top = `-${
      newBackgroundSize.height + margin.top + margin.bottom
    }px`;
    this.#canvas.style.top = `${padding.top + margin.top}px`;

    if (toBeCreatedBackground) {
      this.#backgroundCanvas.style.left = `${margin.left}px`;
      this.#backgroundCanvas.style.top = `${margin.top}px`;
    }

    this.#textFrame.resize();
    this.#resetStage();
    this.onResize();

    this.restart();
  };

  #draw = (currentTime) => {
    if (!this.#isProcessing) {
      return;
    }

    if (this.isDrawFinished()) {
      this.#isProcessing = false;
      this.onDrawFinish();

      return;
    }

    if (currentTime - this.#previousTime > BaseType.FPS_TIME) {
      this.onDraw();
      this.#previousTime = currentTime;
    }

    requestAnimationFrame(this.#draw);
  };

  #getClientSize = (elementObj, paddingWidth = 0, paddingHeight = 0) => {
    return {
      width: Math.round(elementObj.offsetWidth - paddingWidth),
      height: Math.round(elementObj.offsetHeight - paddingHeight),
    };
  };
}
