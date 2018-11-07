let cvs, ctx;
let canvas_width, canvas_height;

export const ColorPicker = {

  _mx: 0, //moved x

  _direction: 0,

  _color: null,

  _colors: [
    [255, 104, 169],
    [158, 50, 138],
    [149, 60, 230],
    [128, 13, 230],
    [242, 242, 242], //起始
    [36, 130, 224],
    [9, 200, 184],
    [51, 166, 33],
    [159, 159, 172],
    [175, 131, 72],
    [237, 171, 118],
    [252, 234, 89],
    [255, 213, 46],
    [245, 134, 0],
    [252, 111, 54],
    [219, 64, 39]
  ],

  _colorSeries: {
    '242,242,242': [],
    '36,130,224': [
      [4, 41, 78], [24, 86, 147], [18, 96, 176], [36, 130, 224], [96, 173, 250],
      [20, 125, 175], [55, 174, 229], [95, 205, 255], [176, 230, 255], [168, 215, 244]
    ],
    '9,200,184': [
      [23, 85, 80], [1, 160, 147], [9, 200, 184], [31, 224, 208], [64, 251, 236],
      [18, 146, 107], [45, 189, 129], [63, 218, 166], [135, 254, 214], [135, 254, 244]
    ],
    '51,166,33': [
      [8, 61, 6], [31, 114, 18], [51, 166, 33], [62, 199, 40], [105, 234, 70],
      [90, 109, 3], [119, 140, 18], [162, 189, 37], [221, 249, 89], [174, 253, 135]
    ],
    '159,159,172': [
      [0, 0, 0], [85, 85, 96], [123, 123, 135], [159, 159, 172], [221, 221, 237],
      [115, 110, 105], [148, 143, 139], [186, 181, 178], [209, 207, 207], [250, 250, 250]
    ],
    '175,131,72': [
      [65, 33, 11], [93, 43, 19], [141, 71, 27], [180, 101, 52], [224, 158, 116],
      [127, 94, 50], [175, 131, 72], [223, 172, 104], [247, 211, 161], [242, 210, 188]
    ],
    '237,171,118': [
      [89, 50, 21], [141, 71, 27], [180, 101, 52], [194, 138, 83], [221, 143, 95],
      [237, 171, 118], [255, 191, 144], [254, 206, 191], [253, 223, 197], [255, 175, 126]
    ],
    '252,234,89': [
      [145, 128, 2], [199, 179, 14], [237, 212, 2], [252, 226, 2], [252, 234, 89],
      [198, 196, 1], [226, 222, 3], [252, 250, 2], [250, 248, 121], [255, 246, 161]
    ],
    '255,213,46': [
      [147, 98, 34], [204, 138, 53], [237, 180, 55], [255, 213, 46], [255, 225, 109],
      [210, 186, 50], [234, 209, 66], [255, 230, 87], [255, 245, 188], [255, 233, 166]
    ],
    '245,134,0': [
      [94, 52, 0], [134, 80, 11], [187, 114, 25], [245, 134, 0], [255, 161, 0],
      [225, 93, 0], [255, 105, 0], [252, 155, 58], [255, 187, 117], [255, 194, 84]
    ],
    '252,111,54': [
      [133, 39, 2], [170, 51, 3], [206, 70, 17], [252, 111, 54], [255, 142, 94],
      [209, 91, 27], [230, 122, 64], [252, 163, 116], [250, 213, 171], [251, 183, 156]
    ],
    '219,64,39': [
      [108, 24, 19], [168, 39, 32], [219, 64, 39], [240, 75, 61], [244, 121, 98],
      [239, 0, 10], [251, 50, 60], [251, 99, 108], [254, 180, 184], [255, 205, 202]
    ],
    '255,104,169': [
      [136, 28, 75], [194, 35, 106], [251, 55, 142], [255, 104, 169], [255, 154, 200],
      [249, 32, 172], [250, 120, 204], [251, 160, 218], [252, 213, 239], [255, 210, 230]
    ],
    '158,50,138': [
      [105, 21, 60], [140, 34, 83], [192, 68, 127], [235, 113, 170], [245, 152, 196],
      [158, 50, 138], [203, 72, 180], [239, 112, 216], [245, 152, 196], [255, 195, 222]
    ],
    '149,60,230': [
      [38, 10, 68], [72, 36, 106], [116, 47, 178], [149, 60, 230], [192, 127, 250],
      [147, 39, 167], [185, 76, 216], [224, 120, 246], [233, 187, 251], [218, 187, 254]
    ],
    '128,13,230': [
      [50, 36, 106], [67, 46, 160], [75, 48, 191], [97, 66, 229], [143, 118, 251],
      [97, 30, 175], [126, 12, 229], [141, 89, 253], [196, 160, 252], [191, 175, 251]
    ]
  },

  _colorItems: [],

  _defaultColorActiveIndex: 0,

  initialize(colorStr) {
    this.initCanvas();
    this.initColors(colorStr);
    this._colorChanged = false;
  },

  initColors(colorStr) {
    let defaultColors = colorStr.match(/\w{6}/g)
        .map(t => [t.slice(0, 2), t.slice(2, 4), t.slice(4)]
        .map(c => parseInt(c, 16)));
    this._colorSeries['242,242,242'] = defaultColors.slice(0, 10);
    this._updateStates(); 
    this._updateColorItems(this._colors[4]);
  },

  _updateStates() {
    let mx = this._mx;
    let step = 0.125;
    let beginIndex = mx / step >> 0;
    let dx = mx % step;
    let totalColors = this._colors;
    let total = totalColors.length;
    let colorLen = 9;
    let colors, lefts, widths;
    beginIndex = beginIndex % total;
    if (beginIndex >= 0 && beginIndex < total - colorLen) {
      colors = totalColors.slice(beginIndex, (beginIndex + colorLen) % total);
    } else {
      colors = [...totalColors.slice(beginIndex), ...totalColors.slice(0, (beginIndex + colorLen) % total)]
    }
    //console.log(beginIndex, colors);
    
    lefts = [0, 0, 0.125, 0.25, 0.375, 0.625, 0.75, 0.875, 1];
    widths = [0, 0.125, 0.125, 0.125, 0.25, 0.125, 0.125, 0.125, 0];
    if (dx > 0) {
      lefts = lefts.map((left, i) => {
        if (i < 2) { return left }
        if (i === 5) { return left - dx * 2 };
        return left - dx;
      });
      widths = widths.map((w, i) => {
        if (i === 8) {
          return dx;
        }
        if (i === 5) {
          return w + dx;
        }
        if (i === 4 || i === 1) {
          return w - dx;
        }
        return w;
      });
    } else if (dx < 0) {
      lefts = lefts.map((left, i) => {
        if (i === 0) { return left }
        if (i === 4) { return left - dx * 2 };
        return left - dx;
      });
      widths = widths.map((w, i) => {
        if (i === 0) {
          return -dx;
        }
        if (i === 3) {
          return w - dx;
        }
        if (i === 4 || i === 7) {
          return w + dx;
        }
        return w;
      });
    }

    this._renderCanvas(colors, lefts, widths);
    let dxPercent = dx / 0.125 * this._direction;
    let baseColor = dx > 0 ? colors[5] : colors[3];
    if (((dxPercent < 0 && dxPercent > -0.5) || dxPercent > 0.5) && !this._colorChanged) {
      baseColor = Math.abs(dxPercent) < 0.5 ? colors[4] : baseColor;
      this._colorChanged = true;
      this._updateColorItems(baseColor);
    } else if ((dxPercent > 0 && dxPercent < 0.5) || dxPercent < -0.5) {
      this._colorChanged = false;
    }
  },

  _renderCanvas(colors, lefts, widths) {
    ctx.clearRect(0, 0, canvas_width, canvas_height);
    colors.forEach((color, i) => {
      ctx.fillStyle = 'rgb(' + color.join() + ')';
      ctx.beginPath();
      ctx.fillRect(Math.floor(lefts[i] * canvas_width), 0, Math.ceil(widths[i] * canvas_width), canvas_height);
    });
  },

  _updateColorItems(color) {
    let key = color.join();
    
    this._colorItems = this._colorSeries[key];
    this._updatePickedColor();
    this._renderColorItems();
  },

  _renderColorItems() {
    let wrap = document.querySelector('.color-items');
    let html = '';
    this._colorItems.forEach((item, index) => {
      let temp = `<div class="color-item ${this._defaultColorActiveIndex == index ? 'color-item-active' : ''}" 
                style="background-color:rgb(${item})" data-color="${item}" data-index="${index}"></div>`;
      html += temp;
    });
    wrap.innerHTML = html;
  },

  _updatePickedColor() {
    let color = this._colorItems[this._defaultColorActiveIndex];
    this._color = color;
    this._onPickColor(color);
  },

  _onPickColor() {},

  onPickColor(callback) {
    this._onPickColor = (color) => {
      if (callback) {
        callback(color);
      }
    };
    if (this._color) {
      callback(this._color);
    }
  },

  _RGB2HSB([rgbR, rgbG, rgbB]) {
    let min = Math.min(rgbR, rgbG, rgbB);
    let max = Math.max(rgbR, rgbG, rgbB);
    let hsbB = max / 255;
    let hsbS = max === 0 ? 0 : (max - min) / max;
    let hsbH = 0;
    if (max == rgbR && rgbG >= rgbB) {
      hsbH = (rgbG - rgbB) * 60 / (max - min) + 0;
    } else if (max == rgbR && rgbG < rgbB) {
      hsbH = (rgbG - rgbB) * 60 / (max - min) + 360;
    } else if (max == rgbG) {
      hsbH = (rgbB - rgbR) * 60 / (max - min) + 120;
    } else if (max == rgbB) {
      hsbH = (rgbR - rgbG) * 60 / (max - min) + 240;
    }
    return [hsbH, hsbS, hsbB]
  },

  _HSB2RGB: function([h, s, v]) {
    let r = 0;
    let g = 0;
    let b = 0;
    let i = h / 60 % 6 >> 0;
    let f = (h / 60) - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
      default:
        break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
  },

  _calcMove: function() {
    let dx = this._touch0.clientX - this._touch1.clientX;
    this._direction = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    this._mx += dx / canvas_width;
    this._updateStates();
  },

  _calcBounce: function() {
    setTimeout(() => {
      let dx = 0.125 - Math.abs(this._mx) % 0.125;
      if (dx === 0 || dx === 0.125 || this._direction === 0 || isNaN(this._direction)) {
        this._touch0 = this._touch1 = null;           
        return; 
      }
      dx = dx < 0.005 ? dx : 0.005;
      this._mx += dx * this._direction;
      this._updateStates();                  
      if (Math.abs(this._mx) % 0.125 >= 0.005 ) {
        this._calcBounce();          
      }
    }, 10);
  },

  initCanvas() {
    cvs = document.querySelector('#colorCvs');
    cvs.bound = cvs.getBoundingClientRect();
    canvas_width = cvs.width = cvs.bound.width;
    canvas_height = cvs.height = cvs.bound.height;
    ctx = cvs.getContext('2d');

    this.initEvents();
  },

  initEvents() {
    cvs.addEventListener('touchstart', e => {
      e.stopPropagation();
      this.onTouchStart(e);
    });
    cvs.addEventListener('touchmove', e => {
      e.stopPropagation();
      this.onTouchMove(e);
    });
    cvs.addEventListener('touchend', e => {
      e.stopPropagation();
      if (this._isClick) {
        this._isClick = false;
        return;
      }
      this.onTouchEnd(e);
    });
    cvs.addEventListener('click', e => {
      e.stopPropagation();
      let x0 = e.clientX;
      if (x0 < cvs.width / 2 + cvs.width / 8 && x0 > cvs.width / 2 - cvs.width / 8) {return;}
      let x1 = x0 > cvs.width / 2 ? cvs.width / 2 + cvs.width / 8 : cvs.width / 2 - cvs.width / 8;
      this._isClick = true;
      this._touch0 = {clientX: x0};
      this._touch1 = {clientX: x1};
      this._colorChanged = false;
      this._calcMove();
      this.onTouchEnd(e);
    })
    let items = document.querySelector('.color-items');
    items.addEventListener('touchend', e => {
      e.stopPropagation();
      this.onPickColorItem(e.target);
    })
  },

  onTouchStart(e) {
    this._touch0 = e.touches[0];
  },

  onTouchMove(e) {
    this._touch1 = e.touches[0];
    if (this._touch0 && this._touch0.clientX !== this._touch1.clientX) {
      this._calcMove();        
    }
    this._touch0 = {clientX: this._touch1.clientX, clientY: this._touch1.clientY};
    clearTimeout(this._endTimer);
    this._endTimer = setTimeout(() => {
      this._calcBounce();
    }, 100);
  },

  onTouchEnd(e) {
    clearTimeout(this._endTimer);
    this._calcBounce();
  },

  onPickColorItem(elm) {
    let {color, index} = elm.dataset;
    if (!color) {return;}
    this._defaultColorActiveIndex = index;
    this._renderColorItems();
    this._color = color.split(',').map(c => +c);
    this._onPickColor(this._color);
  }

}