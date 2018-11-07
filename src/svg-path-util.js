import SvgPath from 'svg-path-to-canvas'
import {updateProgress} from './progress'

let svgPaths = [], framePaths = [];

const svgUtil = {

  _hitMap: {},

  initPaths(pathArr) {
    if (!pathArr.length) {return;}
    let allFrames = new Path2D();
    let allPathStr = '';
    const MIN_AREA = 3;
    
    svgPaths = pathArr.map((pathStr, id) => {
      let path = new Path2D(pathStr);
      path._id = id;
      path._str = pathStr;
      return path;
    });
    //console.log(svgPaths.length);
    //预处理，过滤掉面积小于一定值的路径
    svgPaths = svgPaths.filter(path => {
      //使用SvgPath转换获得path的区域大小
      let pathStr = path._str;
      let helper = new SvgPath(pathStr);
      let [x0, y0, x1, y1] = helper.bounds;
      let w = x1 - x0;
      let h = y1 - y0;
      let area = Math.abs(w * h);
      return area >= MIN_AREA;
    });
    //console.log(svgPaths.length);
    svgPaths.forEach(path => {
      //部分系统没有addPath
      if (allFrames.addPath) {
        allFrames.addPath(path);
      } else {
        allPathStr += path._str;
      }
    })
    if (!allFrames.addPath) {
      allFrames = new Path2D(allPathStr);
    }
    framePaths = svgPaths;
    framePaths.allFrames = allFrames;
    this.pathLength = svgPaths.length;
  },

  clearHitMap() {
    this._hitMap = {};
  },

  addToHitMap(index) {
    this._hitMap[index] = 1;
  },

  isInHitMap(region) {
    if (!region || isNaN(region._id)) { return; }
    return this._hitMap[region._id]
  },

  updateHitMap(ids, point) {
    ids = [...ids];
    let missed = ids.slice(point);
    this._hitMap = ids.reduce((r, id) => { 
      if (missed.indexOf(id) === -1) {
        r[id] = 1; 
      }
      return r;
    }, {});
  },

  isPointInPaths(ctx, x, y) {
    let path = null;
    let len = this.pathLength;
    for (let i = 0; i < len; i++) {
      if (ctx.isPointInPath(svgPaths[i], x, y)) {
        path = svgPaths[i];
        break;
      }
    }
    return path;
  },

  getColoredRegions(ids, colors) {
    let fitted = {};
    let regions = [];
    let regionsSortByColor = {};
    ids.forEach((id, i) => {
      let _region = svgPaths.filter(function (path) {
        return path._id == id;
      })[0];
      _region._color = colors[i];
      if (!fitted[id]) {
        fitted[id] = 1;
        regions.push(_region);
      }
    });
    regions.forEach(region => {
      let _color = region._color; 
      if (!regionsSortByColor[_color]) {
        regionsSortByColor[_color] = [];
      }
      regionsSortByColor[_color].push(region);
    });
    this.updateAllFrames(regions);
    updateProgress(regions.length, svgPaths.length);
    return this.mergeRegions(regionsSortByColor);
  },

  updateAllFrames(regions) {
    let ids = regions.map(region => region._id);
    framePaths.allFrames = null;
    framePaths = svgPaths.filter(path => ids.indexOf(path._id) === -1);
    let allFrames = new Path2D();
    let allPathStr = '';
    framePaths.forEach(path => {
      if (allFrames.addPath) {
        allFrames.addPath(path);
      } else {
        allPathStr += path._str;
      }
    });
    if (!allFrames.addPath) {
      allFrames = new Path2D(allPathStr);
    }
    framePaths.allFrames = allFrames;
  },

  mergeRegions(regions) {
    let mergedPaths = Object.keys(regions).map(color => {
      let paths = regions[color];
      let mergedPath = new Path2D;
      let mergedStr = '';
      paths.forEach(path => {
        //部分机型没有addPath
        if (mergedPath.addPath) {
          mergedPath.addPath(path);
        } else {
          mergedStr += path._str;
        }
      });
      if (!mergedPath.addPath) {
        mergedPath = new Path2D(mergedStr);
      }
      mergedPath._color = color;
      return mergedPath;
    });
    return mergedPaths;
  },

  getOppositeRegions(regions) {
    if (!regions.length) {return svgPaths}
    let ids = regions.map(region => region._id);
    return svgPaths.filter(path => ids.indexOf(path._id) === -1);
  }
};

export {
  svgUtil,
  svgPaths,
  framePaths
}