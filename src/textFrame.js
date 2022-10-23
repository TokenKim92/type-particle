import Particle from './particle.js';
import {
  HORIZONTAL,
  VERTICAL,
  LEFT,
  TOP,
  RIGHT,
  BOTTOM,
  ALL_SIDE,
} from './utils.js';

class TextFrame {
  #ctx;
  #rootStyle;
  #text;
  #baseLinePos;
  #particleEase;
  #getSpreadPos;
  #alpha;
  #textCountPerLine = [];

  constructor(ctx, rootStyle, text, spreadOption) {
    this.#ctx = ctx;
    this.#rootStyle = rootStyle;
    this.#text = text;

    this.#particleEase = spreadOption.speed / 100;
    this.#getSpreadPos = this.#getSpreadHandler(spreadOption.mode);
    this.#alpha = spreadOption.alpha;
  }

  getParticles = (stageRect) => {
    this.#baseLinePos = [];
    this.#textCountPerLine = [];
    this.#ctx.save();

    this.#ctx.font = `${this.#rootStyle.fontWeight} ${this.#rootStyle.fontSize} ${this.#rootStyle.fontFamily}`; //prettier-ignore
    this.#ctx.fillStyle = `rgba(255, 255, 255, ${this.#alpha})`;
    this.#ctx.textBaseline = 'middle';

    const textFields = [];
    if (this.#calculateLineCount(stageRect) === 1) {
      this.#drawTextFrame(stageRect, this.#text);
      this.#getTextFields(this.#text).forEach((textField) =>
        textFields.push(textField)
      );

      this.#textCountPerLine.push(textFields.length);
    } else {
      const textList = this.#getTextList(stageRect);
      let curTextCount;
      let prevTextCount = 0;

      textList.forEach((lineText, index) => {
        this.#drawTextFrame(stageRect, lineText, index);
        this.#getTextFields(lineText, index).forEach((textField) =>
          textFields.push(textField)
        );

        curTextCount = textFields.length;
        this.#textCountPerLine.push(curTextCount - prevTextCount);
        prevTextCount = curTextCount;
      });
    }

    const particles = this.#createParticles(stageRect, textFields);

    this.#ctx.clearRect(0, 0, stageRect.width, stageRect.height);
    this.#ctx.restore();

    return particles;
  };

  #getTextList = (stageRect) => {
    const newTextList = [];

    this.#text.split('\n').forEach((lineText) => {
      const textList = lineText.split(' ');
      let prevText = '';
      let isOutOfStage = false;
      let isLastText = false;

      textList.forEach((text, index) => {
        isOutOfStage =
          this.#ctx.measureText(prevText + text).width > stageRect.width;
        isLastText = index === textList.length - 1;

        if (isOutOfStage) {
          newTextList.push(prevText.trimEnd());
          isLastText ? newTextList.push(text) : (prevText = text + ' ');
        } else {
          isLastText
            ? newTextList.push(prevText + text)
            : (prevText = prevText + text + ' ');
        }
      });
    });

    return newTextList;
  };

  #drawTextFrame = (stageRect, text, index = 0) => {
    const totalTextMetrics = this.#ctx.measureText(text);
    const baseLinePos = this.#calculateBaseLinePos(
      stageRect,
      totalTextMetrics,
      index
    );
    this.#baseLinePos.push(baseLinePos);

    this.#ctx.fillText(text, baseLinePos.x, baseLinePos.y);
  };

  #getTextFields = (text, index = 0) => {
    const textFields = [];
    const textWidthList = [];
    const baseLinePos = this.#baseLinePos[index];
    let character;
    let prevCharacter = '';
    let textMetrics;
    let textField;
    let actualTextWidth;
    let offsetPosX;

    for (let i = 0; i < text.length; i++) {
      character = text[i];
      textMetrics = this.#ctx.measureText(character);

      if (character === ' ') {
        textWidthList.push(textMetrics.width);
        continue;
      }

      actualTextWidth =
        this.#ctx.measureText(prevCharacter + character).width -
        this.#ctx.measureText(prevCharacter).width;
      offsetPosX =
        actualTextWidth !== textMetrics.width
          ? textMetrics.width - actualTextWidth
          : 0;

      textField = {
        x:
          i === 0
            ? Math.round(baseLinePos.x - textMetrics.actualBoundingBoxLeft)
            : Math.round(
                textWidthList.reduce(
                  (sum, textWidth) => sum + textWidth,
                  baseLinePos.x
                ) -
                  textMetrics.actualBoundingBoxLeft -
                  offsetPosX
              ),
        y: Math.round(baseLinePos.y - textMetrics.actualBoundingBoxAscent - 1),
        width: Math.round(
          textMetrics.actualBoundingBoxLeft + textMetrics.actualBoundingBoxRight
        ),
        height: Math.round(
          textMetrics.actualBoundingBoxAscent +
            textMetrics.actualBoundingBoxDescent +
            2
        ),
      };

      textWidthList.push(actualTextWidth);
      textFields.push(textField);
      prevCharacter = character;
    }

    return textFields;
  };

  #createParticles = (stageRect, textFields) => {
    const particles = [];
    const imageData = this.#ctx.getImageData(
      0, 0, stageRect.width, stageRect.height
    ); // prettier-ignore

    const lineHeight = this.#calculateLineHeight(stageRect);
    const lineStageRect = {
      x: stageRect.x,
      y: stageRect.y,
      width: stageRect.width,
      height: lineHeight,
    };
    let lineIndex = 0;
    let alpha = 0;

    textFields.forEach((textField, index) => {
      if (lineIndex < Math.floor(index / this.#textCountPerLine[lineIndex])) {
        lineIndex++;
        lineStageRect.y = stageRect.y + lineHeight * lineIndex;
      }

      for (let y = textField.y; y < textField.y + textField.height; y++) {
        for (let x = textField.x; x < textField.x + textField.width; x++) {
          alpha = imageData.data[(x + y * stageRect.width) * 4 + 3];
          alpha && particles.push(new Particle({x, y}, this.#getSpreadPos(x, y, lineStageRect), alpha, this.#particleEase));
        }
      } // prettier-ignore
    });

    return particles;
  };

  #calculateBaseLinePos = (stageRect, textMetrics, index) => {
    const calculateBaseLinePosX = () => {
      switch (this.#rootStyle.textAlign) {
        case 'end':
          return Math.round(stageRect.width - textMetrics.width);
        case 'center':
          return Math.round((stageRect.width - textMetrics.width) / 2);
        case 'justify':
          console.warn("'justify' option doesn't work.");
        case 'start':
        default:
          return 0;
      }
    };

    // TODO: find more case
    const calculateBaseLinePosY = (index) => {
      const lineHeight = this.#calculateLineHeight(stageRect);
      const baseLinePosY =
        (lineHeight +
          textMetrics.actualBoundingBoxAscent -
          textMetrics.actualBoundingBoxDescent) /
        2;
      return Math.round(baseLinePosY + lineHeight * index);
    };

    return {
      x: calculateBaseLinePosX(),
      y: calculateBaseLinePosY(index),
    };
  };

  #calculateLineHeight = (stageRect) => {
    if (this.#rootStyle.lineHeight !== 'normal') {
      return parseInt(this.#rootStyle.lineHeight);
    }

    //TODO: This is an estimate and may not be accurate!
    const height = parseInt(this.#rootStyle.fontSize) * 1.2;
    const lineCount = Math.round(stageRect.height / height);

    return stageRect.height / lineCount;
  };

  #calculateLineCount = (stageRect) => {
    return Math.round(stageRect.height / this.#calculateLineHeight(stageRect));
  };

  #getSpreadHandler(spreadMode) {
    switch (spreadMode) {
      case HORIZONTAL:
        return (x, y, stageRect) => ({
          x: Math.random() * stageRect.width + stageRect.x,
          y,
        });
      case VERTICAL:
        return (x, y, stageRect) => ({
          x,
          y: Math.random() * stageRect.height + stageRect.y,
        });
      case LEFT:
        return (x, y, stageRect) => ({
          x: 0,
          y: Math.random() * stageRect.height + stageRect.y,
        });
      case TOP:
        return (x, y, stageRect) => ({
          x: Math.random() * stageRect.width + stageRect.x,
          y: 0,
        });
      case RIGHT:
        return (x, y, stageRect) => ({
          x: stageRect.width + stageRect.x,
          y: Math.random() * stageRect.height + stageRect.y,
        });
      case BOTTOM:
        return (x, y, stageRect) => ({
          x: Math.random() * stageRect.width + stageRect.x,
          y: stageRect.height + stageRect.y,
        });
      case ALL_SIDE:
      default:
        return (x, y, stageRect) => ({
          x: Math.random() * stageRect.width + stageRect.x,
          y: Math.random() * stageRect.height + stageRect.y,
        });
    }
  }
}

export default TextFrame;
