export default class TextFrame {
  #ctx;
  #rootStyle;
  #alphaValue;
  #text;
  #particleSortMode;
  #lineTextAttributes = [];
  #textFields = [];
  #pixelInfosList = [];
  #rect;
  #handleSort;

  constructor(ctx, styles, text, particleSortMode) {
    this.#ctx = ctx;
    this.#rootStyle = styles.rootStyle;
    this.#alphaValue = styles.alphaValue;
    this.#text = text;
    this.#particleSortMode = particleSortMode;

    this.#handleSort = this.#getSortHandler(particleSortMode);
  }

  resize = () => {
    this.#lineTextAttributes = [];
    this.#textFields = [];
    this.#pixelInfosList = undefined;
    this.#rect = undefined;
  };

  getFittedRect = (stageSize) => {
    if (this.#rect) {
      return this.#rect;
    }

    const oneLineHandler = (stageSize) => {
      const textFields = this.#getTextFields(
        this.#text,
        this.#drawTextFrame(stageSize, this.#text)
      );
      const lastTextField = textFields[textFields.length - 1];
      let top = stageSize.height;
      let bottom = 0;
      textFields.forEach((textField) => {
        top > textField.y && (top = textField.y);
        bottom < textField.y + textField.height &&
          (bottom = textField.y + textField.height);
      });

      return {
        x: textFields[0].x,
        y: top,
        width: lastTextField.x + lastTextField.width - textFields[0].x,
        height: bottom - top,
      };
    };

    const multiLineHandler = (stageSize) => {
      const textList = this.#getTextList(stageSize);
      let textFields;
      let lastTextField, lastTextFieldRight;
      let left = stageSize.width;
      let right = 0;
      let top = stageSize.height;
      let bottom = 0;

      textList.forEach((lineText, index) => {
        textFields = this.#getTextFields(
          lineText,
          this.#drawTextFrame(stageSize, lineText, index)
        );
        lastTextField = textFields[textFields.length - 1];
        lastTextFieldRight = lastTextField.x + lastTextField.width;

        left > textFields[0].x && (left = textFields[0].x);
        right < lastTextFieldRight && (right = lastTextFieldRight);

        if (index === 0) {
          textFields.forEach(
            (textField) => top > textField.y && (top = textField.y)
          );
        } else if (index === textList.length - 1) {
          textFields.forEach(
            (textField) =>
              bottom < textField.y + textField.height &&
              (bottom = textField.y + textField.height)
          );
        }
      });

      return {
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      };
    };

    this.#ctx.save();
    this.#initContext();

    this.#rect =
      this.#calculateLineCount(stageSize) === 1
        ? oneLineHandler(stageSize)
        : multiLineHandler(stageSize);

    this.#ctx.clearRect(0, 0, stageSize.width, stageSize.height);
    this.#ctx.restore();

    return this.#rect;
  };

  getMetrics = (stageSize) => {
    if (this.#textFields.length && this.#pixelInfosList) {
      return {
        textFields: this.#textFields,
        pixelInfosList: this.#pixelInfosList,
      };
    }

    const oneLineHandler = (stageSize) => {
      const lineTextAttributes = [];
      const baseLine = this.#drawTextFrame(stageSize, this.#text);

      lineTextAttributes.push({
        baseLine,
        lineText: this.#text,
      });

      return {
        lineTextAttributes,
        textFields: this.#getTextFields(this.#text, baseLine),
      };
    };

    const multiLineHandler = (stageSize) => {
      const lineTextAttributes = [];
      const textFields = [];
      const textList = this.#getTextList(stageSize);
      let baseLine;

      textList.forEach((lineText, index) => {
        baseLine = this.#drawTextFrame(stageSize, lineText, index);
        lineTextAttributes.push({
          baseLine,
          lineText,
        });

        this.#getTextFields(lineText, baseLine).forEach((textField) =>
          textFields.push(textField)
        );
      });

      return {
        lineTextAttributes,
        textFields,
      };
    };

    this.#ctx.save();
    this.#initContext();

    const result =
      this.#calculateLineCount(stageSize) === 1
        ? oneLineHandler(stageSize)
        : multiLineHandler(stageSize);

    this.#lineTextAttributes = result.lineTextAttributes;
    this.#textFields = result.textFields;
    this.#pixelInfosList = this.#initPixelInfosList(
      stageSize,
      result.textFields
    );

    this.#ctx.clearRect(0, 0, stageSize.width, stageSize.height);
    this.#ctx.restore();

    return {
      textFields: this.#textFields,
      pixelInfosList: this.#pixelInfosList,
    };
  };

  drawText = () => {
    this.#ctx.save();
    this.#initContext(this.#rootStyle.color);

    this.#lineTextAttributes.forEach((lineTextAttribute) => {
      this.#ctx.fillText(
        lineTextAttribute.lineText,
        lineTextAttribute.baseLine.x,
        lineTextAttribute.baseLine.y
      );
    });

    this.#ctx.restore();
  };

  #initContext = (fillStyle = undefined) => {
    fillStyle ?? (fillStyle = `rgba(255, 255, 255, ${this.#alphaValue})`);

    this.#ctx.font = `${this.#rootStyle.fontWeight} ${this.#rootStyle.fontSize} ${this.#rootStyle.fontFamily}`; //prettier-ignore
    this.#ctx.fillStyle = fillStyle;
    this.#ctx.textBaseline = 'middle';
  };

  #getTextList = (stageSize) => {
    const newTextList = [];

    this.#text.split('\n').forEach((lineText) => {
      const textList = lineText.split(' ');
      let prevText = '';
      let isOutOfStage = false;
      let isLastText = false;

      textList.forEach((text, index) => {
        isOutOfStage =
          this.#ctx.measureText(prevText + text).width > stageSize.width;
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

    while (newTextList.includes('')) {
      const index = newTextList.indexOf('');
      newTextList.splice(index, 1);
    }

    return newTextList;
  };

  #drawTextFrame = (stageSize, text, index = 0) => {
    const totalTextMetrics = this.#ctx.measureText(text);
    const baseLinePos = this.#calculateBaseLinePos(
      stageSize,
      totalTextMetrics,
      index
    );

    this.#ctx.fillText(text, baseLinePos.x, baseLinePos.y);

    return baseLinePos;
  };

  #getTextFields = (text, baseLinePos) => {
    const textFields = [];
    const textWidthList = [];
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

  #initPixelInfosList = (stageSize, textFields) => {
    const mainList = [];
    const secondList = [];
    const imageData = this.#ctx.getImageData(
      0, 0, stageSize.width, stageSize.height
    ); // prettier-ignore

    let alpha = 0;
    textFields.forEach((textField, index) => {
      this.#particleSortMode === 'field' && mainList.push(new Array());

      for (let y = textField.y; y < textField.y + textField.height; y++) {
        for (let x = textField.x; x < textField.x + textField.width; x++) {
          alpha = imageData.data[(x + y * stageSize.width) * 4 + 3];
          alpha && this.#handleSort(mainList, secondList, index, x, y, alpha);
        }
      }
    });

    return { mainList, secondList };
  };

  #calculateBaseLinePos = (stageSize, textMetrics, index) => {
    const calculateBaseLinePosX = () => {
      switch (this.#rootStyle.textAlign) {
        case 'end':
          return Math.round(
            stageSize.width - textMetrics.actualBoundingBoxRight
          );
        case 'center':
          return Math.round((stageSize.width - textMetrics.width) / 2);
        case 'justify':
          console.warn("'justify' option doesn't work.");
        case 'start':
        default:
          return Math.round(textMetrics.actualBoundingBoxLeft);
      }
    };

    // TODO: find more case
    const calculateBaseLinePosY = (index) => {
      const lineHeight = this.#calculateLineHeight(stageSize);
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

  #calculateLineHeight = (stageSize) => {
    if (this.#rootStyle.lineHeight !== 'normal') {
      return parseInt(this.#rootStyle.lineHeight);
    }

    //TODO: This is an estimate and may not be accurate!
    const heightOffset = 1.2;
    const height = parseInt(this.#rootStyle.fontSize) * heightOffset;
    const lineCount = Math.round(stageSize.height / height);

    return stageSize.height / lineCount;
  };

  #calculateLineCount = (stageRect) => {
    return Math.round(stageRect.height / this.#calculateLineHeight(stageRect));
  };

  #getSortHandler = (mode) => {
    switch (mode) {
      case 'position':
        return (posList, alphaList, garbageIndex, x, y, alpha) => {
          if (!posList[x]) {
            posList[x] = new Array();
            alphaList[x] = new Array();
          }

          if (!posList[x].includes(y)) {
            posList[x].push(y);
            alphaList[x].push(alpha);
          }
        };
      case 'field':
      default:
        return (fieldList, garbageList, index, x, y, alpha) =>
          fieldList[index].push({ x, y, alpha });
    }
  };
}
