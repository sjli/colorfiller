import {svgUtil, svgPaths, framePaths} from './svg-path-util'
import {SVG_PATH_DATA, SVG_WIDTH, SVG_HEIGHT} from './sample-svg-path-data'

const SCALE_THRESHOLD = 0.01;
const MOVE_THRESHOLD = 1;
const MAX_SCALE = 10;
const MIN_SCALE = 1;
const RATIO = 2;
const BASE_WIDTH = 300;
const BENCH_MARK_LEVEL = 10; //小程序systemInfo返回，用于区分是否开启低端手机下性能兼容模式

let canvas_width = BASE_WIDTH * RATIO;
let canvas_height;
let origin_scale;

let cvs, ctx, shadowCvs, shadowCtx, offscreenCvs, offscreenCtx;
let region;

const Drawer = {

  initialize() {

    //debug
    window.onerror = function(e) {
      //alert(e)
    }

    this._initStates();
    this._initProps();
    this._initSizes();
    
    svgUtil.initPaths(SVG_PATH_DATA);
    this.initCanvas();

  },

  _speedTest() {
    this._regions = svgPaths.slice(0, 1000);
    let color = [Math.random() * 255 >> 0, Math.random() * 255 >> 0, Math.random() * 255 >> 0].join();
    this._regions.forEach(r => r._color = 'rgb(' + color + ')');
    let count = 0;
    let start=Date.now();
    let max = 0;
    let total = 0;
    let timer = setTimeout(function random(){
    max = Math.max(max, Date.now() - start);
    total += Date.now() - start;
    if (count>100){
      clearTimeout(timer);
      alert('max render time:' + max + '; average time:' + (total / count >> 0));
      return;
    }
    this.renderScale(Math.random()*7+1)
    start = Date.now()
    count++;
    timer=setTimeout(random, 1)
    },1)
  },

  showLoading() {
    this._domLoading.classList.remove('hide');
  },

  hideLoading() {
    this._domLoading.classList.add('hide');
  },

  initCanvas() {
    cvs = document.querySelector('#cvs');
    ctx = cvs.getContext('2d');
    shadowCvs = document.querySelector('#shadowCvs');
    shadowCtx = shadowCvs.getContext('2d');
    shadowCvs.width = cvs.width = canvas_width;
    shadowCvs.height = cvs.height = canvas_height;
    cvs.bound = cvs.getBoundingClientRect();
    cvs.top = cvs.bound.top;
    cvs.left = cvs.bound.left;
    cvs.style.height = canvas_height / RATIO + 'px';
    this.initOffscreenCanvas();
    setTimeout(() => {
      this.renderShadow(2);
    })
    this.renderRegions(ctx, true);
    
    this._inited = true;
    this.initEvents();
    
  },

  initOffscreenCanvas() {
    if (window.OffscreenCanvas) {
      offscreenCvs = new OffscreenCanvas(canvas_width, canvas_height);
      offscreenCvs._isOffscreen = true;
    } else {
      offscreenCvs = document.createElement('canvas');
      offscreenCvs.width = canvas_width;
      offscreenCvs.height = canvas_height;
    }
    offscreenCtx = offscreenCvs.getContext('2d');
  },

  initEvents() {
    let wrap = document.querySelector('.main-wrap');
    document.body.addEventListener('touchstart', e => {
      e.preventDefault(); //禁止安卓下拉
    }, {passive: false})
    if (!this._modeInbox) {
      wrap.addEventListener('touchstart', e => {
        //e.preventDefault();
        e.stopPropagation();
        this.onTouchStart(e);
      });
      wrap.addEventListener('touchmove', e => {
        e.preventDefault();
        e.stopPropagation();
        this.onTouchMove(e);
      }, {passive: false});
      wrap.addEventListener('touchend', e => {
        //e.preventDefault();
        e.stopPropagation();
        this.onTouchEnd(e);
      });
    }

    cvs.addEventListener('touchstart', e => {
      //e.preventDefault();
      e.stopPropagation();
      this.onTouchStart(e);
    });
    cvs.addEventListener('touchmove', e => {
      e.preventDefault();
      e.stopPropagation();
      this.onTouchMove(e);
    }, {passive: false});
    cvs.addEventListener('touchend', e => {
      //e.preventDefault();
      e.stopPropagation();
      this.onTouchEnd(e);
    });

    this.initBtnEvents();
  },

  initBtnEvents() {
    let btnBack = document.querySelector('.icon-back');
    let btnFore = document.querySelector('.icon-fore');
    let btnSave = document.querySelector('.btn-save');

    btnBack.addEventListener('touchend', e => {
      e.stopPropagation();
      this.goBackSnap.bind(this)(e);
    });
    btnFore.addEventListener('touchend', e => {
      e.stopPropagation();
      this.goForeSnap.bind(this)(e);
    });
    btnSave.addEventListener('touchend', e => {
      e.stopPropagation();
      this.save.bind(this)(e);
    });
  },

  onSetColor(color) {
    this._color = color;
    svgUtil.clearHitMap();
  },

  onTouchStart(e) {
    if (e.touches.length > 1) {
      return this.onMultiTouchStart();
    }
    this._touchX = e.touches[0].clientX - cvs.left;
    this._touchY = e.touches[0].clientY - cvs.top;
  },

  onTouchMove(e) {
    this._touchX = null;
    this._touchY = null;
    this._transforming = true;
    if (this._transEndTimer) {
      clearTimeout(this._transEndTimer);
      this._transEndTimer = null;
    }
    //多点操作
    if (e.touches.length > 1) {
      return this.onMultiTouchMove(e.touches);
    }

    let {clientX, clientY} = e.touches[0];
    if (!this._lastTouch) {
      return this._lastTouch = {clientX, clientY};
    }
    let dx = clientX - this._lastTouch.clientX;
    let dy = clientY - this._lastTouch.clientY;
    
    this.renderTranslate(dx * RATIO, dy * RATIO);
    this._lastTouch = {clientX, clientY};
  },

  onTouchEnd(e) {
    this._lastTouch = null;
    if (this._transforming) {
      this._transEndTimer = setTimeout(() => {
        this.multiTouches0 = this.multiTouches1 = null;
        this.onMultiTouchEnd();
      }, 50)
      return;
    }
    if (isNaN(this._touchX) || isNaN(this._touchY)) {return;}
    this._detectRegion(this._touchX, this._touchY);
  },

  onMultiTouchStart() {
    this._transforming = true;
  },

  onMultiTouchMove(touches) {
    clearTimeout(this._scaleEndTimer);
    this._scaleEndTimer = setTimeout(() => {
      this.multiTouches0 = this.multiTouches1 = null;
      this.onMultiTouchEnd();
    }, 50);
    let x0 = touches[0].clientX, x1 = touches[1].clientX;
    let y0 = touches[0].clientY, y1 = touches[1].clientY;
    if (!this.multiTouches0) {
      this.multiTouches0 = [{clientX: x0, clientY: y0}, {clientX: x1, clientY: y1}];
      return;
    }
    this.multiTouches1 = [{clientX: x0, clientY: y0}, {clientX: x1, clientY: y1}];

    let scale = this._currentScale *(1 + 0.005 * this._calcDistDiff(this.multiTouches0, this.multiTouches1)); //0.005为矫正系数，为得到较平滑的缩放体验
    
    this.multiTouches0 = [{clientX: x0, clientY: y0}, {clientX: x1, clientY: y1}];

    if (Math.abs(this._currentScale - scale) > SCALE_THRESHOLD) {
      this.renderScale(scale);
    }
  },

  onMultiTouchEnd() {
    clearTimeout(this._scaleEndTimer);
    this._transforming = false;
    this.renderRegions(ctx, true);
  },

  renderBucket() {
    if (!this._color) {return;}
    let color = 'rgb(' + this._color.join() + ')';
    this._colors.splice(this._snapPoint, this._regionIds.length - this._snapPoint, color);
    this._regionIds.splice(this._snapPoint, this._regionIds.length - this._snapPoint, region._id);
    this._regions = svgUtil.getColoredRegions(this._regionIds, this._colors);
    svgUtil.addToHitMap(this._regionIds[this._regionIds.length - 1]);

    setTimeout(() => {
      this.renderShadow(2);
    })
    this._fillOneRegion(ctx, region);

    this.updateStack();
    //demo不用自动保存
    //this.checkAutoSave();
  },

  checkAutoSave() {
    this._saveStep = this._saveStep ? this._saveStep + 1 : 1;
    //每十次自动保存一次
    if (this._saveStep % 10 !== 0) {return;}
    this.save(null, true)
  },

  updateStack() {
    this._snapPoint = this._regionIds.length;
    this._stackLen = this._snapPoint;
    this._updateBtnsStates();
  },

  goBackSnap() {
    if (this._snapPoint < 1) { return; }
    this._travelStack(-1);
  },

  goForeSnap() {
    if (this._snapPoint > this._regionIds.length - 1) { return; }
    this._travelStack(1);
  },



  save(e, isAutoSave) {
    alert('do nothing on demo');
  },

  _travelStack(add) {
    let snapPoint = this._snapPoint + add;
    let regionIds = this._regionIds.slice(0, snapPoint);
    let colors = this._colors.slice(0, snapPoint);
    this._regions = svgUtil.getColoredRegions(regionIds, colors);
    this._snapPoint = snapPoint;
    
    clearTimeout(this._stackTimer);
    this._stackTimer = setTimeout(() => {
      setTimeout(() => {
        this.renderShadow(2);
      })
      this.renderRegions(ctx, true); 
    })
    svgUtil.updateHitMap(this._regionIds, snapPoint);
    this._updateBtnsStates();
  },

  _updateBtnsStates() {
    let btnBack = document.querySelector('.icon-back');
    let btnFore = document.querySelector('.icon-fore');
    let btnSave = document.querySelector('.btn-save');
    const clsDisabled = 'disabled';
    if (this._snapPoint < 1) {
      btnBack.classList.add(clsDisabled);
      btnSave.classList.add(clsDisabled);
    } else {
      btnBack.classList.remove(clsDisabled);
      btnSave.classList.remove(clsDisabled);
    }
    if (this._snapPoint > this._stackLen - 1) {
      btnFore.classList.add(clsDisabled);
    } else {
      btnFore.classList.remove(clsDisabled);
    }
  },

  renderScale(scale) {
    let currentScale = scale;
    if (currentScale > MAX_SCALE) {
      currentScale = MAX_SCALE;
    } else if (currentScale < MIN_SCALE) {
      currentScale = MIN_SCALE;
    }

    this._currentScale = currentScale;
    if (this._modeInbox) {
      this._checkTransBounds();
    }

    clearTimeout(this._transTimer);    
    this._transTimer = setTimeout(() => {
      this.renderTransform();
    })
  },

  renderTranslate(dx, dy) {
    let { _currentTranslate, _currentScale, _centerX, _centerY } = this;
    _currentTranslate[0] += dx / _currentScale;
    _currentTranslate[1] += dy / _currentScale;
    if (this._modeInbox) {
      this._checkTransBounds(_currentTranslate);
    }

    clearTimeout(this._transTimer);
    this._transTimer = setTimeout(() => {
      this.renderTransform();
    })
  },

  renderShadow(scale) {
    let ctx = shadowCtx;
    let canvas = ctx.canvas;
    if (this._modeInbox) {scale = 1;} //框内模式下使用低精度
    scale = scale || 1;
    if (!this._modeInbox) {
      canvas.width = canvas_width * scale;
      canvas.height = canvas_height * scale;
    }
    ctx.save();
    ctx.scale(scale, scale);
    ctx.clearRect(0, 0, canvas_width, canvas_height);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas_width, canvas_height);
    ctx.fillStyle = '#ffffff';
    ctx.fill(framePaths.allFrames);

    this._regions.forEach(region => {
      ctx.fillStyle = region._color;
      ctx.fill(region);
    });
    ctx.restore();
  },

  _calcTransforms() {
    let {_currentTranslate, _currentScale, _centerX, _centerY, _maxCssScale} = this;
    let t0 = _currentTranslate[0] * _currentScale;
    let t1 = _currentTranslate[1] * _currentScale;
    let currentCssScale = _currentScale > _maxCssScale ? _maxCssScale : _currentScale;
    let currentCtxScale = _currentScale / currentCssScale;
    let maxCtxT0 = _centerX * (_currentScale - currentCssScale);
    let maxCtxT1 = _centerY * (_currentScale - currentCssScale);
    let ctxT0 = Math.abs(t0) > maxCtxT0 ? maxCtxT0 * t0 / Math.abs(t0) : t0;
    let ctxT1 = Math.abs(t1) > maxCtxT1 ? maxCtxT1 * t1 / Math.abs(t1) : t1;
    let cssT0 = t0 - ctxT0;
    let cssT1 = t1 - ctxT1;
    this._transforms = {
      currentCssScale,
      currentCtxScale,
      maxCtxT0,
      maxCtxT1,
      ctxT0,
      ctxT1,
      cssT0,
      cssT1
    }
  },

  _fillOneRegion(ctx, region) {
    if (!region) {return;}
    if (this._modeInbox) {
      return this.renderRegionsInBox(ctx, true, region);
    }
    let {_centerX, _centerY, _currentScale, _docWidth, _docHeight, _bottomHeight} = this;
    let {currentCssScale, currentCtxScale, maxCtxT0, maxCtxT1, ctxT0, ctxT1, cssT0, cssT1} = this._transforms;
    ctx.save();
    ctx.translate(-maxCtxT0, -maxCtxT1);
    ctx.scale(_currentScale / origin_scale, _currentScale / origin_scale);
    ctx.translate(ctxT0 / _currentScale * origin_scale, ctxT1 / _currentScale * origin_scale);
    ctx.fillStyle = region._color;
    ctx.fill(region);
    ctx.restore();
  },

  _renderOffscreenCtx() {
    if (this._isHiFi) {
      let regions = this._regions;
      let rLen = regions.length;
      offscreenCtx.fillStyle = '#000000';
      offscreenCtx.fillRect(0, 0, offscreenCvs.width, offscreenCvs.height);
      offscreenCtx.fillStyle = '#ffffff';
      offscreenCtx.fill(framePaths.allFrames);
      
      for (let i = 0; i < rLen; i++) {
        offscreenCtx.fillStyle = regions[i]._color;
        offscreenCtx.fill(regions[i]);
      }
    } else {
      let currentCssScale = this._transforms.currentCssScale;
      offscreenCtx.drawImage(shadowCvs, 0, 0, offscreenCvs.width / currentCssScale >> 0, offscreenCvs.height / currentCssScale >> 0);
    }
  },

  renderRegions(ctx, hifi) {
    this._isHiFi = hifi;
    //低端手机使用限制框内模式
    if (this._modeInbox) {
      return this.renderRegionsInBox(ctx, hifi);
    }

    this._calcTransforms();
    let {_centerX, _centerY, _currentScale, _docWidth, _docHeight, _bottomHeight} = this;
    let {currentCssScale, currentCtxScale, maxCtxT0, maxCtxT1, ctxT0, ctxT1, cssT0, cssT1} = this._transforms;
    let regions = this._regions;
    let cssWidth = canvas_width * currentCssScale / RATIO >> 0;
    let cssHeight = canvas_height * currentCssScale / RATIO >> 0;
    let cssLeft = (cssT0 * currentCssScale + _centerX * (1 - currentCssScale)) / RATIO;
    let cssTop = (cssT1 * currentCssScale + _centerY * (1 - currentCssScale)) / RATIO;

    this._cssLeft = cssLeft;
    this._cssTop = cssTop;

    let cssText = '';
    cssText += ';width:' + cssWidth + 'px;';
    cssText += 'height:' + cssHeight + 'px;';
    cssText += 'left:' + cssLeft + 'px;';
    cssText += 'top:' + cssTop + 'px;';
    cvs.style.cssText = cssText;

    //set canvas size
    cvs.width = canvas_width * currentCssScale >> 0;
    cvs.height = canvas_height * currentCssScale >> 0;
    offscreenCvs.width = canvas_width * currentCssScale >> 0;
    offscreenCvs.height = canvas_height * currentCssScale >> 0;
    offscreenCtx.clearRect(0, 0, offscreenCvs.width, offscreenCvs.height);
    offscreenCtx.save();
    //transform
    offscreenCtx.translate(-maxCtxT0, -maxCtxT1);
    offscreenCtx.scale(_currentScale / origin_scale, _currentScale / origin_scale);
    offscreenCtx.translate(ctxT0 / _currentScale * origin_scale, ctxT1 / _currentScale * origin_scale);   
    //draw frames
    this._renderOffscreenCtx();

    offscreenCtx.restore();

    let bitmap;
    if (offscreenCvs.transferToImageBitmap) {
      bitmap = offscreenCvs.transferToImageBitmap();
    } else {
      bitmap = offscreenCvs;
    }
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(bitmap, 0, 0, cvs.width, cvs.height);
    
  },

  renderRegionsInBox(ctx, hifi, region) {
    this._applyTransform(ctx);
    if (!region) {
      ctx.save();
      ctx.scale(origin_scale, origin_scale);
      ctx.clearRect(0, 0, canvas_width, canvas_height);
      ctx.restore();
    }
    if (region) {
      ctx.fillStyle = region._color;
      ctx.fill(region);
    } else if (hifi) {
      ctx.clearRect(0, 0, canvas_width, canvas_height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas_width, canvas_height);
      ctx.fillStyle = '#ffffff';
      ctx.fill(framePaths.allFrames);

      this._regions.forEach(region => {
        ctx.fillStyle = region._color;
        ctx.fill(region);
      });
    } else {
      ctx.drawImage(shadowCvs, 0, 0, canvas_width, canvas_height);
    }
    
    ctx.restore();
  },

  renderTransform() {
    this.renderRegions(ctx)
  },

  _detectRegion(x, y) {
    if (x == null || y == null) {return;}
    this._calcTransforms();
    let { _currentScale, _currentTranslate, _centerX, _centerY } = this;
    if (!this._modeInbox) {
      let {cssT0, cssT1, ctxT0, ctxT1, maxCtxT0, maxCtxT1, currentCssScale} = this._transforms;
      x = ((x * RATIO - ctxT0 - cssT0 * currentCssScale) - _centerX * (1 - _currentScale)) / _currentScale * origin_scale;
      y = ((y * RATIO - ctxT1 - cssT1 * currentCssScale) - _centerY * (1 - _currentScale)) / _currentScale * origin_scale;
    } else {
      x = ((x * RATIO - _currentTranslate[0] * _currentScale) - _centerX * (1 - _currentScale)) / _currentScale * origin_scale;
      y = ((y * RATIO - _currentTranslate[1] * _currentScale) - _centerY * (1 - _currentScale)) / _currentScale * origin_scale;
    }
    region = svgUtil.isPointInPaths(ctx, x, y);
    if (!region) {
      console.log('no region');
      return;
    }
    this._isDulpliHitted = svgUtil.isInHitMap(region);
    if (this._isDulpliHitted) {
      console.log('hitted')
    }
    this.renderBucket();
  },

  _calcDist: (p0, p1) => {
    return Math.sqrt((p0.clientX - p1.clientX) * (p0.clientX - p1.clientX) + (p0.clientY - p1.clientY) * (p0.clientY - p1.clientY))
  },

  _calcDistDiff(t0, t1) {
    let dist0 = this._calcDist(t0[0], t0[1]);
    let dist1 = this._calcDist(t1[0], t1[1]);
    return dist1 - dist0
  },

  _calcCenter([t0, t1]) {
    return {
      x: (t0.clientX + t1.clientX) >> 1,
      y: (t0.clientY + t1.clientY) >> 1
    }
  },

  _checkTransBounds: function(curTrans) {
    let { _currentScale, _currentTranslate } = this;
    let maxTx = (canvas_width * (_currentScale - 1) / _currentScale) >> 1;
    let maxTy = (canvas_height * (_currentScale - 1) / _currentScale) >> 1;
    _currentTranslate = curTrans || _currentTranslate;
    if (_currentTranslate[0] > maxTx) { _currentTranslate[0] = maxTx }
    if (_currentTranslate[0] < -maxTx) { _currentTranslate[0] = -maxTx }
    if (_currentTranslate[1] > maxTy) { _currentTranslate[1] = maxTy }
    if (_currentTranslate[1] < -maxTy) { _currentTranslate[1] = -maxTy }
    this._currentTranslate = _currentTranslate;
  },

  _applyTransform(_ctx) {
    let { _currentScale, _centerX, _centerY, _currentTranslate } = this;
    let compScale = _currentScale / origin_scale;
    _ctx.save();
    _ctx.translate(_centerX * (1 - _currentScale), _centerY * (1 - _currentScale));
    _ctx.scale(compScale, compScale);
    _ctx.translate(_currentTranslate[0] * origin_scale, _currentTranslate[1] * origin_scale);
  },

  _restore(_ctx) {
    _ctx.restore();
  },

  _initStates() {
  this._transforming = false;
  this._currentScale = 1;
  this._currentTranslate = [0, 0];
  this._centerX = 0;
  this._centerY = 0;
  this._cssLeft = 0;
  this._cssTop = 0;
  this._snapUrl = '';
  this._compSnapUrl = '';
  this._snapStack = [];
  this._snapPoint = 0;
  this._regionIds = [];
  this._regions = [];
  this._colors = [];
  this._bottomHeight = 150;
  if (document.documentElement.clientHeight > 650) {
    document.querySelector('.toolbar').classList.add('large-size');
    this._bottomHeight = 220;
  }
},



_initProps() {
  this.props = {
    width: SVG_WIDTH, 
    height: SVG_HEIGHT, 
    benchmarkLevel: BENCH_MARK_LEVEL
  };

  this._checkModeInbox();
},

_initSizes() {
  let {width, height} = this.props;
  canvas_height = +height / +width * canvas_width >> 0;
  origin_scale = +width / canvas_width;
  this._centerX = canvas_width >> 1;
  this._centerY = canvas_height >> 1;
  let _docWidth = document.documentElement.offsetWidth;
  let _docHeight = document.documentElement.offsetHeight;
  this._docWidth = _docWidth;
  this._docHeight = _docHeight;
  this._maxCssScale = _docWidth / BASE_WIDTH; //css缩放上限
  document.querySelector('.main-wrap').style.height = ((canvas_height * (1.25 - 0.125)) >> 1) + 'px';
},

_checkModeInbox() {
  let brandWhiteList = ['google'];
  let modelWhiteList = [];
  this.props.brand = this.props.brand || '';
  this.props.model = this.props.model || '';
  this.props.system = this.props.system || '';
  if (!isNaN(this.props.benchmarkLevel)) {
    //安卓使用benchmarkLevel
    if (this.props.benchmarkLevel <= 8) {
      this._modeInbox = true;
    }
    let sysVersion = this.props.system.match(/Android(\d+)/);
    if (sysVersion && sysVersion[1] <= 4) {
      this._modeInbox = true;
    }
  } else if (this.props.brand.toLowerCase() === 'iphone') {
    let version = this.props.model.match(/iPhone(\d+),/);
    if (version && version[1] < 7) {
      this._modeInbox = true;
    }
  }

  if (this._modeInbox) {
    document.body.classList.add('mode-inbox');
  }
}


}

export default Drawer;