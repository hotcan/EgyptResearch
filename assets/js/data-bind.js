/**
 * data-bind.js — 全站数据绑定
 * 从 data/days.json 读取元数据，注入所有 [data-key] 元素
 * 用法：编辑 data/days.json，刷新浏览器即可看到全站同步更新
 */
(function () {
  'use strict';

  // 根据当前页面路径深度计算到根目录的相对路径
  // /index.html               → depth=0 → prefix=''
  // /days/day1/index.html     → depth=2 → prefix='../../'
  // /days/day1/action/        → depth=3 → prefix='../../../'  (目录URL，无文件名)
  const parts = location.pathname.split('/').filter(Boolean);
  const lastPart = parts.length > 0 ? parts[parts.length - 1] : '';
  const isFile = lastPart.includes('.');  // 有扩展名则为文件，否则为目录
  const depth = isFile ? parts.length - 1 : parts.length;
  const prefix = depth > 0 ? '../'.repeat(depth) : '';

  /** 按点号路径读取嵌套对象值（支持数组下标）
   *  'days.0.title' → data.days[0].title */
  function getByPath(obj, path) {
    return path.split('.').reduce(function (cur, key) {
      return cur != null ? cur[key] : undefined;
    }, obj);
  }

  /** 将 JSON 数据注入所有 [data-key] 元素 */
  function inject(data) {
    document.querySelectorAll('[data-key]').forEach(function (el) {
      var val = getByPath(data, el.getAttribute('data-key'));
      if (val !== undefined && val !== null) {
        el.innerHTML = val;
      }
    });
  }

  // 页面加载后获取 JSON 并注入
  function init() {
    fetch(prefix + 'data/days.json')
      .then(function (r) { return r.json(); })
      .then(inject)
      .catch(function (e) {
        // 静默失败：静态托管环境下保持 HTML 原有内容
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
