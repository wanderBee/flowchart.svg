var FlowchartSvg = (function () {
'use strict';

function __extends(d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

/**
 * 扩展 Snap.svg
 */
/**
 * 十六进制转RGB
 */
String.prototype.hex2rgb = function () {
    //十六进制颜色值的正则表达式
    var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
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
    }
    else {
        return sColor;
    }
};
/**
 * 增加原型方法
 *
 *   Paper.prototype.linkCircle：连接2个圆
 *   Paper.prototype.circlesByPath : 根据path路径生成多个圆
 */
Snap.plugin(function (Snap, Element, Paper) {
    var proto = Paper.prototype;
    var snapPath = Snap.path;
    /**
        按照给定的path生成circle
        @param {string} path svg路径 "M10 10L90 90" eg.
        @param {number} parts 数量
        @param {number} r 半径
      */
    proto.circlesByCircle = function (parts, r, show) {
        // 获取Paper的中心位置开始画圆
        var paperWidth = this.node.width.baseVal.value;
        var paperHeight = this.node.height.baseVal.value;
        var outerCircleR = Math.max((r * 15 + 20 * parts) / Math.PI, 120);
        outerCircleR = Math.min(outerCircleR, Math.min(paperWidth / 2, paperHeight / 2) - r - 80);
        var outerCirclePath = "M" + paperWidth / 2 + " " + paperHeight /
            2 + " m" + -outerCircleR + " 0 a " + outerCircleR + " " + outerCircleR + " 0 1 0 " + outerCircleR *
            2 + " 0 a " + outerCircleR + " " + outerCircleR + " 0 1 0 " + -outerCircleR * 2 + " 0";
        if (show) {
            this.path(outerCirclePath).attr({
                fill: 'transparent',
                stroke: '#f21855'
            });
        }
        var g = this.circlesByPath(outerCirclePath, parts, r);
        g.center = {
            x: parseFloat((paperWidth / 2).toString()),
            y: parseFloat((paperWidth / 2).toString())
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
    proto.circlesByPath = function (path, parts, r) {
        if (path === 'circle') {
            return this.circlesByCircle(parts, r);
        }
        // 获取路径总的长度（单位：像素）
        var totalLength = snapPath.getTotalLength(path);
        // 获取每一等分的长度（起始于路径的长度）
        var lengthPerPart = totalLength / parts;
        // 根据路径获取指定长度所在的点坐标集合
        var points = [];
        var curLength = 0;
        var g = [];
        var i = 0;
        for (; i < parts; i++) {
            curLength = Math.min(lengthPerPart * (i + 1), totalLength);
            var curPoint = snapPath.getPointAtLength(path, curLength);
            points.push({ x: curPoint.x, y: curPoint.y });
            var curColor = this.DEFAULT_COLORS[i] || '#999';
            var curRGBColor = curColor.hex2rgb();
            var curCircle = this.circle(curPoint.x, curPoint.y, r).attr({
                fill: "rgba(" + curRGBColor[0] + "," + curRGBColor[1] + "," + curRGBColor[2] + ", .3)",
                stroke: curColor,
                strokeWidth: 2
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
    proto.linkCircle = function (sCircle, tCircle, lineColor) {
        lineColor = lineColor || '#CCC';
        if (sCircle.type !== 'circle' || tCircle.type !== 'circle') {
            return;
        }
        // sourceCircle.pointTo(targetCircle);
        var sCircleBBox = sCircle.getBBox();
        var tCircleBBox = tCircle.getBBox();
        var tLinePath = "M" + sCircleBBox.cx + " " + sCircleBBox.cy + " L" + tCircleBBox.cx + " " + tCircleBBox.cy;
        var totalLengthOfTLine = snapPath.getTotalLength(tLinePath);
        var retLinePath = snapPath.getSubpath(tLinePath, sCircleBBox.r1, totalLengthOfTLine - tCircleBBox.r1);
        var retLine = this.path(retLinePath).toDefs();
        var totalLengthOfRLine = snapPath.getTotalLength(retLine);
        var startPoint = snapPath.getPointAtLength(retLinePath, 0);
        var endPoint = snapPath.getPointAtLength(retLinePath, totalLengthOfRLine);
        var linkSvg = this.link({
            x: startPoint.x,
            y: startPoint.y
        }, {
            x: endPoint.x,
            y: endPoint.y
        }, lineColor);
        this.links = this.links || [];
        this.links.push({
            source: sCircle,
            line: linkSvg,
            target: tCircle
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
    proto.link = function (source, target, color) {
        // 三角形marker
        var triagleSize = 5;
        var trl = createTtriagleMarker.call(this, color);
        var linkLine = this.line(source.x, source.y, target.x, target.y);
        linkLine.attr({
            stroke: color,
            strokeWidth: 2,
            markerEnd: trl
        });
        return linkLine;
        function createTtriagleMarker(color) {
            var p1 = this.path("M2,2 L3," + (triagleSize / 2 + 2) + " L2," + (2 + triagleSize) + "  L" + (2 +
                triagleSize) + "," + (triagleSize / 2 + 2) + " L2,2 Z").attr({
                fill: color,
                stroke: color,
                strokeWidth: 1,
                opacity: 0.6
            });
            return p1.marker(0, 0, 2 * triagleSize, 2 * triagleSize, 2 + triagleSize, triagleSize / 2 + 2);
        }
    };
    /**
        标记一个Element元素（说明信息）
        @param {Element} elem 需要标记的对象
        @param {string} labelText 标记内容
        @param {string} align 位置（left|right）
      */
    proto.label = function (elem, labelText, align) {
        if (align === void 0) { align = 'right'; }
        var bbox = elem.getBBox();
        var tempText = this.text(-1000, -1000, labelText);
        var tempTextBBox = tempText.getBBox();
        var DEFAULTS = {
            rectWidth: Math.max(tempTextBBox.width + 16 * 2, 80),
            rectHeight: 30,
            fenceWidth: 5,
            textAlign: 'center'
        };
        var rectStartPoint = {
            x: bbox.x + bbox.width + 30,
            y: bbox.y + (bbox.height - DEFAULTS.rectHeight) / 2
        };
        var bigRect = this.rect(rectStartPoint.x, rectStartPoint.y, DEFAULTS.rectWidth, DEFAULTS.rectHeight).attr({
            fill: '#fff',
            stroke: '#ddd',
            strokeWidth: 1
        });
        var fenceRect = this.rect(rectStartPoint.x - DEFAULTS.fenceWidth, rectStartPoint.y + 0.5, DEFAULTS.fenceWidth, DEFAULTS.rectHeight - 1).attr({
            fill: elem.color || '#dedede',
            stroke: elem.color || '#dedede',
            strokeWidth: 2
        });
        var ptCenter = {
            x: rectStartPoint.x - DEFAULTS.fenceWidth,
            y: rectStartPoint.y + DEFAULTS.rectHeight / 2,
            size: 6
        };
        var pTriagle = this.path("M" + ptCenter.x + "," + (ptCenter.y - ptCenter.size) + " L" + (ptCenter.x -
            ptCenter.size * 2 +
            2) + "," + ptCenter.y + " L" + ptCenter.x + "," + (ptCenter.y + ptCenter.size) + " Z").attr({
            fill: elem.color || '#dedede'
        });
        var textSvg;
        if (DEFAULTS.textAlign == 'left') {
            textSvg = this.text(rectStartPoint.x + 8, rectStartPoint.y + bbox.r2 - 1, labelText); // y坐标有1像素的偏移，需要 - 1
        }
        else {
            textSvg = this.text(rectStartPoint.x + DEFAULTS.rectWidth / 2 - tempTextBBox.width / 2, rectStartPoint.y + bbox.r2 - 1, labelText); // y坐标有1像素的偏移，需要 - 1
        }
        var textSvgBBox = textSvg.getBBox();
        var g = this.g();
        g.add(bigRect, fenceRect, pTriagle, textSvg);
        var f = this.filter(Snap.filter.shadow(1, 2, 2, '#999', 0.3));
        g.attr({
            filter: f
        });
        if (align == 'left') {
            // 整个标记框旋转180°到元素左侧
            g.transform("rotate(180, " + bbox.cx + ", " + bbox.cy + ")");
            // 自旋转180°，否则字体是上下颠倒的
            textSvg.transform("rotate(180, " + textSvgBBox.cx + ", " + (textSvgBBox.cy + 0.5) + ")"); // g旋转后textSVG的y坐标有.5像素的偏移，需要 + .5
            //  g旋转后阴影方向要改变
            f = this.filter(Snap.filter.shadow(1, -2, 2, '#777', 0.3));
            g.attr({
                filter: f
            });
        }
    };
});
var Snapsvg = (function () {
    function Snapsvg(selector) {
        this.snap = Snap(selector);
    }
    Snapsvg.prototype._onload = function () {
        if (typeof arguments[0] === 'function') {
            arguments[0].apply(this, [].splice.call(arguments, 1));
        }
    };
    Snapsvg.prototype._render = function () { };
    return Snapsvg;
}());

var DEFAULTS = {
    type: 'polar',
    r: 22,
    data: []
};
var FlowSvg$1 = (function (_super) {
    __extends(FlowSvg, _super);
    function FlowSvg(selector) {
        _super.call(this, selector);
        this.root = this.snap.node;
        return this;
        // throw new Error('FlowSvg has no constructor.');
    }
    FlowSvg.prototype._onload = function () {
        if (typeof arguments[0] === 'function') {
            arguments[0].apply(this, [].splice.call(arguments, 1));
        }
    };
    FlowSvg.prototype._render = function () { };
    /**
     * 根据selector初始化FlowSvg对象
     * 不存在符合选择器的svg元素则新建
     * @param selector svg选择器|svgElement
     */
    FlowSvg.init = function (selector) {
        var snapsvg = new FlowSvg(selector);
        console.log('snapsvg', snapsvg.snap);
        return snapsvg;
    };
    /**
     * 根据参数生成对应的流程图
     * @param options 流程图参数
     */
    FlowSvg.prototype.setOption = function (options) {
        var _this = this;
        var opts = Object.assign(DEFAULTS, options);
        console.log('>>> FlowchartSvg setOption:', this, opts);
        this.type = opts.type;
        this.r = opts.r;
        if (this.type !== 'polar') {
            return;
        }
        var circleDatas = {};
        var circleKeys = new Set();
        opts.data.forEach(function (item) {
            if (!circleKeys.has(item.source)) {
                circleDatas[item.source] = {
                    linkFrom: null,
                    linkTo: item.target
                };
                circleKeys.add(item.source);
            }
            else {
                circleDatas[item.source].linkTo = item.target;
            }
            if (!circleKeys.has(item.target)) {
                circleDatas[item.target] = {
                    linkFrom: item.source,
                    linkTo: null
                };
                circleKeys.add(item.target);
            }
            else {
                circleDatas[item.target].linkFrom = item.source;
            }
        });
        var g = this.snap.circlesByPath('circle', circleKeys.size, this.r);
        // 互相指向
        for (var i = 0; i < g.length; i++) {
            var circle01 = g[0];
            var circle02 = g[1];
            var circle03 = g[2];
            var link01 = this.snap.linkCircle(circle01, circle02, circle01.color);
            var link01b = this.snap.linkCircle(circle02, circle03, circle02.color);
            var link02 = this.snap.linkCircle(circle03, circle01, circle03.color);
        }
        var index = 0;
        circleKeys.forEach(function (key) {
            _this.snap.label(g[index], key, index++ == 2 ? 'left' : '');
        });
    };
    return FlowSvg;
}(Snapsvg));

return FlowSvg$1;

}());
//# sourceMappingURL=FlowchartSvg.js.map
