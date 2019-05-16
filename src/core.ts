import { Snapsvg } from './snap';

const DEFAULTS = {
  type: 'polar',
  r: 22,
  data: [],
};
export class FlowSvg extends Snapsvg {
  root: any;
  type: string;
  r: number;

  constructor(selector) {
    super(selector);
    this.root = this.snap.node;
    return this;
    // throw new Error('FlowSvg has no constructor.');
  }

  protected _onload(): void {
    if (typeof arguments[0] === 'function') {
      arguments[0].apply(this, [].splice.call(arguments, 1));
    }
  }

  protected _render(): void {}

  /**
   * 根据selector初始化FlowSvg对象
   * 不存在符合选择器的svg元素则新建
   * @param selector svg选择器|svgElement
   */
  static init(selector) {
    const snapsvg = new FlowSvg(selector);
    console.log('snapsvg', snapsvg.snap);
    return snapsvg;
  }

  /**
   * 根据参数生成对应的流程图
   * @param options 流程图参数
   */
  setOption(options) {
    let opts = Object.assign(DEFAULTS, options);
    console.log('>>> FlowchartSvg setOption:', this, opts);
    this.type = opts.type;
    this.r = opts.r;
    if (this.type !== 'polar') {
      return;
    }

    const circleDatas = {};
    const circleKeys = new Set();
    opts.data.forEach(item => {
      if (!circleKeys.has(item.source)) {
        circleDatas[item.source] = {
          linkFrom: null,
          linkTo: item.target,
        };
        circleKeys.add(item.source);
      } else {
        circleDatas[item.source].linkTo = item.target;
      }
      if (!circleKeys.has(item.target)) {
        circleDatas[item.target] = {
          linkFrom: item.source,
          linkTo: null,
        };
        circleKeys.add(item.target);
      } else {
        circleDatas[item.target].linkFrom = item.source;
      }
    });
    const g = this.snap.circlesByPath('circle', circleKeys.size, this.r);

    // 互相指向

    for (var i = 0; i < g.length; i++) {
      let circle01 = g[0];
      let circle02 = g[1];
      let circle03 = g[2];

      const link01 = this.snap.linkCircle(circle01, circle02, circle01.color);
      const link01b = this.snap.linkCircle(circle02, circle03, circle02.color);
      const link02 = this.snap.linkCircle(circle03, circle01, circle03.color);
    }

    let index = 0;
    circleKeys.forEach(key => {
      this.snap.label(g[index], key, index++ == 2 ? 'left' : '');
    });
  }
}
