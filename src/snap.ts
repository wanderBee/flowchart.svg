import Snap = require('snapsvg');

/**
 * 扩展 Snap.svg
 */

/**
 * 十六进制转RGB
 */
String.prototype.hex2rgb = function() {
  //十六进制颜色值的正则表达式
  const reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;

  var sColor = this.toLowerCase();
  if (sColor && reg.test(sColor)) {
    if (sColor.length === 4) {
      var sColorNew = '#';
      for (var i = 1; i < 4; i += 1) {
        sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
      }
      sColor = sColorNew;
    }
    //处理六位的颜色值
    var sColorChange = [];
    for (var i = 1; i < 7; i += 2) {
      sColorChange.push(parseInt('0x' + sColor.slice(i, i + 2)));
    }
    return sColorChange; //"RGB(" + sColorChange.join(",") + ")";
  } else {
    return sColor;
  }
};

/**
 * 增加原型方法
 *
 *   Paper.prototype.linkCircle：连接2个圆
 *   Paper.prototype.circlesByPath : 根据path路径生成多个圆
 */
Snap.plugin(function(Snap, Element, Paper) {
  const proto = Paper.prototype;
  const snapPath = Snap.path;

  /**
      按照给定的path生成circle
      @param {string} path svg路径 "M10 10L90 90" eg.
      @param {number} parts 数量
      @param {number} r 半径
    */
  proto.circlesByCircle = function(parts, r, show) {
    // 获取Paper的中心位置开始画圆
    const paperWidth = this.node.width.baseVal.value;
    const paperHeight = this.node.height.baseVal.value;
    let outerCircleR = Math.max((r * 15 + 20 * parts) / Math.PI, 120);
    outerCircleR = Math.min(
      outerCircleR,
      Math.min(paperWidth / 2, paperHeight / 2) - r - 80,
    );
    const outerCirclePath = `M${paperWidth / 2} ${paperHeight /
      2} m${-outerCircleR} 0 a ${outerCircleR} ${outerCircleR} 0 1 0 ${outerCircleR *
      2} 0 a ${outerCircleR} ${outerCircleR} 0 1 0 ${-outerCircleR * 2} 0`;
    if (show) {
      this.path(outerCirclePath).attr({
        fill: 'transparent',
        stroke: '#f21855',
      });
    }
    const g = this.circlesByPath(outerCirclePath, parts, r);
    g.center = {
      x: parseFloat((paperWidth / 2).toString()),
      y: parseFloat((paperWidth / 2).toString()),
    };
    return g;
  };
  /**
      按照给定的path生成circle
      @param {string} path 'circle'|路径path
      @param {number} parts 数量
      @param {number} r 半径
    */
  proto.DEFAULT_COLORS = ['#FF0000', '#FF8800', '#00AA00', '#0000AA'];
  proto.circlesByPath = function(path, parts, r) {
    if (path === 'circle') {
      return this.circlesByCircle(parts, r);
    }
    // 获取路径总的长度（单位：像素）
    const totalLength = snapPath.getTotalLength(path);
    // 获取每一等分的长度（起始于路径的长度）
    const lengthPerPart = totalLength / parts;
    // 根据路径获取指定长度所在的点坐标集合
    const points = [];
    const defaultColors = [];
    let curLength = 0;
    let g = [];
    let i = 0;
    for (; i < parts; i++) {
      curLength = Math.min(lengthPerPart * (i + 1), totalLength);
      const curPoint = snapPath.getPointAtLength(path, curLength);
      points.push({ x: curPoint.x, y: curPoint.y });
      const curColor = this.DEFAULT_COLORS[i] || '#999';
      const curRGBColor = curColor.hex2rgb();
      const curCircle = this.circle(curPoint.x, curPoint.y, r).attr({
        fill: `rgba(${curRGBColor[0]},${curRGBColor[1]},${curRGBColor[2]}, .3)`,
        stroke: curColor,
        strokeWidth: 2,
      });

      curCircle.color = curColor;
      g.push(curCircle);
    }
    return g;
  };

  /**
      连接2个圆，生成箭头指向线
      @param {Element} sCircle 连接线起始圆
      @param {Element} tCircle 连接线指向的终点圆
      @param {string} lineColor 连接线的颜色， 默认 '#CCC'
    */
  proto.linkCircle = function(sCircle, tCircle, lineColor) {
    lineColor = lineColor || '#CCC';
    if (sCircle.type !== 'circle' || tCircle.type !== 'circle') {
      return;
    }
    // sourceCircle.pointTo(targetCircle);
    const sCircleBBox = sCircle.getBBox();
    const tCircleBBox = tCircle.getBBox();
    const tLinePath = `M${sCircleBBox.cx} ${sCircleBBox.cy} L${
      tCircleBBox.cx
    } ${tCircleBBox.cy}`;

    const totalLengthOfTLine = snapPath.getTotalLength(tLinePath);
    const retLinePath = snapPath.getSubpath(
      tLinePath,
      sCircleBBox.r1,
      totalLengthOfTLine - tCircleBBox.r1,
    );
    const retLine = this.path(retLinePath).toDefs();
    const totalLengthOfRLine = snapPath.getTotalLength(retLine);
    const startPoint = snapPath.getPointAtLength(retLinePath, 0);
    const endPoint = snapPath.getPointAtLength(retLinePath, totalLengthOfRLine);

    let linkSvg = this.link(
      {
        x: startPoint.x,
        y: startPoint.y,
      },
      {
        x: endPoint.x,
        y: endPoint.y,
      },
      lineColor,
    );
    this.links = this.links || [];
    this.links.push({
      source: sCircle,
      line: linkSvg,
      target: tCircle,
    });

    // 删除暂存的图形
    retLine.remove();

    // const g = this.g();
    // g.add(sCircle, linkSvg, tCircle);
    return linkSvg;
  };

  /**
      连接2个节点，生成箭头指向线
      @param {object} source 源节点
        { x: 1, y: 1}
      @param {object} target 目标节点
        { x: 50, y: 50}
      @return {SnapElement} 连接线
    */
  proto.link = function(source, target, color) {
    // 三角形marker
    const triagleSize = 5;
    const trl = createTtriagleMarker.call(this, color);

    const linkLine = this.line(source.x, source.y, target.x, target.y);
    linkLine.attr({
      stroke: color,
      strokeWidth: 2,
      markerEnd: trl,
    });

    return linkLine;

    function createTtriagleMarker(color) {
      var p1 = this.path(
        `M2,2 L3,${triagleSize / 2 + 2} L2,${2 + triagleSize}  L${2 +
          triagleSize},${triagleSize / 2 + 2} L2,2 Z`,
      ).attr({
        fill: color,
        stroke: color,
        strokeWidth: 1,
        opacity: 0.6,
      });
      return p1.marker(
        0,
        0,
        2 * triagleSize,
        2 * triagleSize,
        2 + triagleSize,
        triagleSize / 2 + 2,
      );
    }
  };

  /**
      标记一个Element元素（说明信息）
      @param {Element} elem 需要标记的对象
      @param {string} labelText 标记内容
      @param {string} align 位置（left|right）
    */
  proto.label = function(elem, labelText, align = 'right') {
    const bbox = elem.getBBox();
    const fenceWidth = 10; // 三角图标和矩形框之间的竖条宽度
    // 计算字符的像素长度
    const tempText = this.text(-1000, -1000, labelText);
    const tempTextBBox = tempText.getBBox();
    const DEFAULTS = {
      rectWidth: Math.max(tempTextBBox.width + 16 * 2, 80), // padding: 8px
      rectHeight: 30,
      fenceWidth: 5,
      textAlign: 'center',
    };

    const rectStartPoint = {
      x: bbox.x + bbox.width + 30,
      y: bbox.y + (bbox.height - DEFAULTS.rectHeight) / 2,
    };
    const bigRect = this.rect(
      rectStartPoint.x,
      rectStartPoint.y,
      DEFAULTS.rectWidth,
      DEFAULTS.rectHeight,
    ).attr({
      fill: '#fff',
      stroke: '#ddd',
      strokeWidth: 1,
    });
    const fenceRect = this.rect(
      rectStartPoint.x - DEFAULTS.fenceWidth,
      rectStartPoint.y + 0.5,
      DEFAULTS.fenceWidth,
      DEFAULTS.rectHeight - 1,
    ).attr({
      fill: elem.color || '#dedede',
      stroke: elem.color || '#dedede',
      strokeWidth: 2,
    });
    const ptCenter = {
      x: rectStartPoint.x - DEFAULTS.fenceWidth,
      y: rectStartPoint.y + DEFAULTS.rectHeight / 2,
      size: 6,
    };
    const pTriagle = this.path(
      `M${ptCenter.x},${ptCenter.y - ptCenter.size} L${ptCenter.x -
        ptCenter.size * 2 +
        2},${ptCenter.y} L${ptCenter.x},${ptCenter.y + ptCenter.size} Z`,
    ).attr({
      fill: elem.color || '#dedede',
    });
    var textSvg;
    if (DEFAULTS.textAlign == 'left') {
      textSvg = this.text(
        rectStartPoint.x + 8,
        rectStartPoint.y + bbox.r2 - 1,
        labelText,
      ); // y坐标有1像素的偏移，需要 - 1
    } else {
      textSvg = this.text(
        rectStartPoint.x + DEFAULTS.rectWidth / 2 - tempTextBBox.width / 2,
        rectStartPoint.y + bbox.r2 - 1,
        labelText,
      ); // y坐标有1像素的偏移，需要 - 1
    }
    const textSvgBBox = textSvg.getBBox();

    const g = this.g();
    g.add(bigRect, fenceRect, pTriagle, textSvg);
    let f = this.filter(Snap.filter.shadow(1, 2, 2, '#999', 0.3));
    g.attr({
      filter: f,
    });

    if (align == 'left') {
      // 整个标记框旋转180°到元素左侧
      g.transform(`rotate(180, ${bbox.cx}, ${bbox.cy})`);
      // 自旋转180°，否则字体是上下颠倒的
      textSvg.transform(
        `rotate(180, ${textSvgBBox.cx}, ${textSvgBBox.cy + 0.5})`,
      ); // g旋转后textSVG的y坐标有.5像素的偏移，需要 + .5
      //  g旋转后阴影方向要改变
      f = this.filter(Snap.filter.shadow(1, -2, 2, '#777', 0.3));
      g.attr({
        filter: f,
      });
    }
  };
});

export class Snapsvg {
  protected snap: any;

  constructor(selector) {
    this.snap = Snap(selector);
  }

  protected _onload(): void {
    if (typeof arguments[0] === 'function') {
      arguments[0].apply(this, [].splice.call(arguments, 1));
    }
  }

  protected _render(): void {}
}
