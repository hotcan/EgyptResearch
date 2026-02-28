/**
 * edit-mode.js v2 — 全页面本地 CMS 编辑模式
 * 全站共享脚本，在所有页面引入
 *
 * 功能：
 *  - 编辑所有文字内容（标题、介绍、正文、图注、data-key 字段）
 *  - 添加新内容块（段落、标题、图片、分隔线、旁注）
 *  - 图片管理（上传、替换、旋转、横竖切换、删除）
 *  - 拖拽上传图片
 *  - 三路保存：HTML 文件 + days.json + localStorage
 *  - 仅在 localhost 本地可用，部署后编辑按钮消失
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════
   * 生产环境检测 — 非 localhost 立即退出，不注入任何 UI
   * ══════════════════════════════════════════════════════════════════ */
  const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!IS_LOCAL) return;

  /* ── 配置 ─────────────────────────────────────────────────────── */
  const EM_PASSWORD  = '';
  const IMG_MAX_DIM  = 1400;     // 上传图片最大边长 px
  const IMG_QUALITY  = 0.85;     // JPEG 压缩质量
  const storageKey   = () => 'em_v1_' + location.pathname;

  /* ── CSS ───────────────────────────────────────────────────────── */
  const CSS = `
    /* ── FAB 按钮组 ── */
    .em-fab {
      position: fixed; bottom: 28px; right: 28px; z-index: 9000;
      display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
    }
    .em-btn {
      padding: 8px 18px; border-radius: 3px;
      border: 1px solid rgba(200,151,58,0.45);
      background: rgba(14,12,9,0.90); color: #c8973a;
      font-family: 'Cinzel', 'Noto Serif SC', serif;
      font-size: 11.5px; letter-spacing: 0.09em;
      cursor: pointer; transition: background .18s, border-color .18s, color .18s;
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      white-space: nowrap; user-select: none;
    }
    .em-btn:hover { background: rgba(200,151,58,0.14); border-color: #c8973a; }
    .em-btn.em-save { background: rgba(200,151,58,0.18); border-color: rgba(200,151,58,0.8); }
    .em-btn.em-save:hover { background: rgba(200,151,58,0.28); }
    .em-btn.em-cancel { border-color: rgba(180,80,80,0.45); color: #b07070; }
    .em-btn.em-cancel:hover { background: rgba(180,80,80,0.12); border-color: rgba(180,80,80,0.8); color: #c07070; }

    /* ── 编辑模式顶部横幅 ── */
    body.em-active::before {
      content: '✏  编辑模式  —  修改文字 · 添加段落 · 管理图片  →  点击「保存」';
      position: fixed; top: 0; left: 0; right: 0; z-index: 8999;
      background: rgba(200,151,58,0.10); border-bottom: 1px solid rgba(200,151,58,0.25);
      color: rgba(200,151,58,0.75); font-family: 'Cinzel', 'Noto Serif SC', serif;
      font-size: 11px; letter-spacing: 0.14em; text-align: center; padding: 5px 0;
      pointer-events: none;
    }

    /* ── 可编辑元素高亮 ── */
    body.em-active [data-em-id] {
      outline: none; border-radius: 2px;
      transition: box-shadow .15s, background .15s;
    }
    body.em-active [data-em-id]:hover {
      box-shadow: 0 0 0 1px rgba(200,151,58,0.35); cursor: text;
    }
    body.em-active [data-em-id]:focus {
      box-shadow: 0 0 0 2px rgba(200,151,58,0.65);
      background: rgba(200,151,58,0.04);
    }

    /* ── Toast 提示 ── */
    .em-toast {
      position: fixed; bottom: 80px; right: 28px; z-index: 9001;
      background: rgba(14,12,9,0.94); border: 1px solid rgba(200,151,58,0.55);
      color: #c8973a; font-family: 'Cinzel', serif;
      font-size: 11.5px; letter-spacing: 0.12em; padding: 8px 16px;
      border-radius: 3px; opacity: 0; transform: translateY(6px);
      transition: opacity .25s, transform .25s; pointer-events: none;
    }
    .em-toast.em-show { opacity: 1; transform: translateY(0); }

    /* ── Block Inserter（+按钮）── */
    .em-inserter {
      display: none; height: 24px; position: relative;
      margin: 2px 0; cursor: pointer;
    }
    body.em-active .em-inserter { display: block; }
    .em-inserter::before {
      content: ''; position: absolute; top: 50%; left: 10%; right: 10%;
      border-top: 1px dashed rgba(200,151,58,0.0);
      transition: border-color .2s;
    }
    .em-inserter:hover::before { border-color: rgba(200,151,58,0.3); }
    .em-inserter-btn {
      position: absolute; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      width: 22px; height: 22px; border-radius: 50%;
      background: rgba(14,12,9,0.92); border: 1px solid rgba(200,151,58,0.25);
      color: rgba(200,151,58,0.4); font-size: 15px; line-height: 20px;
      text-align: center; cursor: pointer; transition: all .2s;
    }
    .em-inserter:hover .em-inserter-btn {
      border-color: rgba(200,151,58,0.6); color: #c8973a;
    }

    /* ── 块类型选择器 ── */
    .em-picker {
      position: absolute; left: 50%; bottom: 100%;
      transform: translateX(-50%); z-index: 9010;
      background: rgba(14,12,9,0.96); border: 1px solid rgba(200,151,58,0.4);
      padding: 4px 0; min-width: 170px; border-radius: 3px;
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .em-picker-item {
      padding: 7px 16px; font-size: 12px; color: rgba(200,151,58,0.8);
      cursor: pointer; font-family: 'Noto Serif SC', serif;
      letter-spacing: 0.05em; transition: background .15s, color .15s;
    }
    .em-picker-item:hover {
      background: rgba(200,151,58,0.12); color: #c8973a;
    }

    /* ── 图片工具栏 ── */
    body.em-active figure { position: relative; }
    .em-img-toolbar {
      position: absolute; top: 8px; right: 8px;
      display: flex; gap: 4px; z-index: 9005;
      opacity: 0; transition: opacity .2s; pointer-events: none;
    }
    body.em-active figure:hover .em-img-toolbar {
      opacity: 1; pointer-events: auto;
    }
    .em-img-tb-btn {
      width: 30px; height: 30px; border-radius: 3px;
      background: rgba(14,12,9,0.88); border: 1px solid rgba(200,151,58,0.45);
      color: #c8973a; font-size: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      transition: background .15s;
    }
    .em-img-tb-btn:hover { background: rgba(200,151,58,0.2); }

    /* ── 上传占位符 ── */
    .em-upload-placeholder {
      border: 2px dashed rgba(200,151,58,0.25);
      padding: 40px 20px; text-align: center;
      color: rgba(200,151,58,0.4); cursor: pointer;
      font-family: 'Cinzel', 'Noto Serif SC', serif;
      font-size: 12px; letter-spacing: 1px;
      transition: border-color .2s, color .2s;
    }
    .em-upload-placeholder:hover {
      border-color: rgba(200,151,58,0.5); color: rgba(200,151,58,0.7);
    }

    /* ── 拖拽上传遮罩 ── */
    .em-dropzone {
      position: fixed; inset: 0; z-index: 9050;
      background: rgba(14,12,9,0.75);
      display: flex; align-items: center; justify-content: center;
      pointer-events: none; opacity: 0; transition: opacity .25s;
    }
    .em-dropzone.em-show { opacity: 1; pointer-events: auto; }
    .em-dropzone-inner {
      border: 2px dashed rgba(200,151,58,0.5);
      padding: 48px 64px; text-align: center; border-radius: 6px;
      color: #c8973a; font-family: 'Cinzel', serif;
      font-size: 14px; letter-spacing: 2px;
    }

    /* ── data-key 编辑高亮 ── */
    body.em-active [data-key][contenteditable] {
      outline: none; border-radius: 2px;
      transition: box-shadow .15s, background .15s;
    }
    body.em-active [data-key][contenteditable]:hover {
      box-shadow: 0 0 0 1px rgba(100,180,200,0.35); cursor: text;
    }
    body.em-active [data-key][contenteditable]:focus {
      box-shadow: 0 0 0 2px rgba(100,180,200,0.6);
      background: rgba(100,180,200,0.04);
    }
  `;

  /* ── 排除祖先选择器 ────────────────────────────────────────────── */
  const EXCLUDE = [
    'nav', '.site-nav', '.page-nav', '.breadcrumb', '.context-strip', 'footer',
    'a', 'button', '.btn', '.tag', '.era-pill', '.filter-pill',
    '#pantheon-grid', '#blessings-grid', '#myth-cards',
    '#domain-filters', '#relation-canvas-wrap', '#stars',
    '#pharaoh-grid', '#era-filters', '#dynasty-rail',
    '#pharaoh-dots', '#era-details', '#papyrus-origin-grid', '#event-cards',
    '.modal', '#modal', '#modal-overlay', '#modal-header', '#modal-body',
    '.filter-pills', '.tab-nav', '.nav-tabs',
    '.em-fab', '.em-picker', '.em-img-toolbar', '.em-inserter', '.em-dropzone',
    // NOTE: [data-key] 不再排除 — 允许编辑
  ];

  /* ── 候选可编辑选择器 ─────────────────────────────────────────── */
  const EDITABLE_SEL = [
    'h1', 'h2', 'h3', 'h4', 'p', 'li', 'blockquote',
    'figcaption',
    '.section-label', '.aside-label',
    '.event-title', '.event-sub',
    '.hero-lead',
    '.cap-title', '.cap-sub',
    '.site-summary', '.site-name-zh',
    '.concept-def', '.concept-quote',
    '.tl-title', '.tl-desc',
    '.structure-desc',
    'td', 'th',
  ].join(', ');

  /* ── 块插入容器选择器 ─────────────────────────────────────────── */
  const INSERT_CONTAINERS = [
    '.prose > section',
    '.event-body',
    '.site-body > .site-section',
  ].join(', ');

  /* ── 状态 ─────────────────────────────────────────────────────── */
  let active = false;
  let originals = {};             // { emId: innerHTML }
  let originalDataKeys = {};      // { 'days.5.title': innerHTML }
  let fab, btnEdit, btnSave, btnCancel, toast;
  let insertedBlocks = [];        // 新增的 DOM 元素
  let dropzone;

  /* ══════════════════════════════════════════════════════════════════
   * 工具函数
   * ══════════════════════════════════════════════════════════════════ */
  function isExcluded(el) {
    return EXCLUDE.some(sel => {
      try { return el.closest(sel) !== null; } catch { return false; }
    });
  }

  function candidates() {
    return Array.from(document.querySelectorAll(EDITABLE_SEL))
      .filter(el => !isExcluded(el));
  }

  function injectCSS() {
    const s = document.createElement('style');
    s.id = 'em-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /** 推算当前页面的照片目录（绝对路径） */
  function photoDir() {
    const parts = location.pathname.split('/').filter(Boolean);
    // /days/dayN/action/ → /days/dayN/photos/
    if (parts.length >= 2 && parts[0] === 'days') {
      return '/' + parts[0] + '/' + parts[1] + '/photos';
    }
    // 其他页面：使用 /assets/photos/
    return '/assets/photos';
  }

  /** 计算从当前页面到目标绝对路径的相对路径 */
  function relativeFrom(absPath) {
    const pageDir = location.pathname.substring(0, location.pathname.lastIndexOf('/'));
    const from = pageDir.split('/').filter(Boolean);
    const to   = absPath.split('/').filter(Boolean);
    let common = 0;
    while (common < from.length && common < to.length && from[common] === to[common]) common++;
    const ups = from.length - common;
    return (ups > 0 ? '../'.repeat(ups) : './') + to.slice(common).join('/');
  }

  /* ══════════════════════════════════════════════════════════════════
   * Toast
   * ══════════════════════════════════════════════════════════════════ */
  function showToast(msg, duration) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('em-show');
    setTimeout(() => toast.classList.remove('em-show'), duration || 1800);
  }

  /* ══════════════════════════════════════════════════════════════════
   * ID 分配 & 恢复
   * ══════════════════════════════════════════════════════════════════ */
  function assignIds() {
    candidates().forEach((el, i) => { el.dataset.emId = String(i); });
  }

  function restoreSaved() {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      candidates().forEach(el => {
        const id = el.dataset.emId;
        if (id !== undefined && data[id] !== undefined) el.innerHTML = data[id];
      });
    } catch { /* 忽略损坏数据 */ }
  }

  /* ══════════════════════════════════════════════════════════════════
   * data-key 编辑支持
   * ══════════════════════════════════════════════════════════════════ */
  function captureDataKeyOriginals() {
    originalDataKeys = {};
    document.querySelectorAll('[data-key]').forEach(el => {
      originalDataKeys[el.getAttribute('data-key')] = el.innerHTML;
    });
  }

  function getDataKeyChanges() {
    const changes = {};
    document.querySelectorAll('[data-key]').forEach(el => {
      const key = el.getAttribute('data-key');
      const cur = el.innerHTML;
      if (originalDataKeys[key] !== undefined && originalDataKeys[key] !== cur) {
        changes[key] = cur;
      }
    });
    return changes;
  }

  async function saveDataKeyChanges(changes) {
    if (Object.keys(changes).length === 0) return true;
    try {
      const resp = await fetch('/em-save-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes }),
      });
      return resp.ok;
    } catch { return false; }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 干净 HTML 生成
   * ══════════════════════════════════════════════════════════════════ */
  function getCleanHTML() {
    const clone = document.documentElement.cloneNode(true);
    // 移除编辑模式注入的元素
    [
      '#em-styles', '.em-fab', '.em-toast', '.em-dropzone',
      '.em-inserter', '.em-img-toolbar', '.em-picker',
    ].forEach(sel => {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    });
    // 移除空的上传占位 figure（没有 img 的）
    clone.querySelectorAll('.em-upload-placeholder').forEach(ph => {
      const fig = ph.closest('figure');
      if (fig && !fig.querySelector('img')) fig.remove();
      else ph.remove();
    });
    // 移除编辑模式创建的隐藏 file input
    clone.querySelectorAll('input[type="file"][style*="display: none"], input[type="file"][style*="display:none"]').forEach(el => el.remove());
    // 清除图片 URL 上的 cache-bust 参数 ?t=xxx
    clone.querySelectorAll('img[src*="?t="]').forEach(img => {
      img.setAttribute('src', img.getAttribute('src').replace(/\?t=\d+$/, ''));
    });
    // 清除编辑属性
    clone.querySelectorAll('[data-em-id]').forEach(el => {
      el.removeAttribute('data-em-id');
      el.removeAttribute('contenteditable');
    });
    clone.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
    });
    // 清除 body 的 em-active 类
    const body = clone.querySelector('body');
    if (body) body.classList.remove('em-active');
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 保存系统（三路）
   * ══════════════════════════════════════════════════════════════════ */
  async function persistSave() {
    const results = [];

    // 1. 保存 data-key 变更到 days.json
    const dkChanges = getDataKeyChanges();
    const jsonOk = await saveDataKeyChanges(dkChanges);
    if (Object.keys(dkChanges).length > 0) {
      results.push(jsonOk ? 'JSON ✓' : 'JSON ✗');
    }

    // 2. 保存干净 HTML 到磁盘
    let htmlOk = false;
    try {
      const resp = await fetch('/em-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: location.pathname, html: getCleanHTML() }),
      });
      htmlOk = resp.ok;
    } catch { /* 静态托管降级 */ }
    results.push(htmlOk ? 'HTML ✓' : '本地缓存');

    // 3. localStorage 备份
    const data = {};
    candidates().forEach(el => {
      if (el.dataset.emId !== undefined) data[el.dataset.emId] = el.innerHTML;
    });
    localStorage.setItem(storageKey(), JSON.stringify(data));

    showToast('已保存  ' + results.join(' · '));
  }

  /* ══════════════════════════════════════════════════════════════════
   * Block Inserter — 添加新内容块
   * ══════════════════════════════════════════════════════════════════ */
  const BLOCK_TYPES = [
    { label: '📝 段落',   tag: 'p' },
    { label: '📌 标题',   tag: 'h3' },
    { label: '🖼️ 图片',  tag: 'figure' },
    { label: '── 分隔线', tag: 'hr' },
    { label: '💬 旁注',   tag: 'aside' },
  ];

  function placeInserters() {
    const containers = document.querySelectorAll(INSERT_CONTAINERS);
    containers.forEach(container => {
      const children = Array.from(container.children).filter(
        el => !el.classList.contains('em-inserter')
      );
      // 在每个子元素之后放一个 inserter
      children.forEach(child => {
        if (child.nextElementSibling && child.nextElementSibling.classList.contains('em-inserter')) return;
        const ins = makeInserter(container);
        child.after(ins);
      });
      // 在容器开头也放一个
      if (children.length > 0 && !container.firstElementChild.classList.contains('em-inserter')) {
        container.prepend(makeInserter(container));
      }
    });
  }

  function makeInserter(container) {
    const div = document.createElement('div');
    div.className = 'em-inserter';
    div.innerHTML = '<span class="em-inserter-btn">+</span>';
    div.addEventListener('click', e => {
      e.stopPropagation();
      showPicker(div, container);
    });
    return div;
  }

  function showPicker(inserterEl, container) {
    closePicker();
    const picker = document.createElement('div');
    picker.className = 'em-picker';
    BLOCK_TYPES.forEach(t => {
      const item = document.createElement('div');
      item.className = 'em-picker-item';
      item.textContent = t.label;
      item.addEventListener('click', e => {
        e.stopPropagation();
        insertBlock(t.tag, inserterEl, container);
      });
      picker.appendChild(item);
    });
    inserterEl.appendChild(picker);
    // 点击外部关闭
    setTimeout(() => document.addEventListener('click', closePicker, { once: true }), 0);
  }

  function closePicker() {
    document.querySelectorAll('.em-picker').forEach(p => p.remove());
  }

  function insertBlock(tag, inserterEl, container) {
    closePicker();
    let newEl;
    switch (tag) {
      case 'p':
        newEl = document.createElement('p');
        newEl.textContent = '在此输入文字…';
        newEl.contentEditable = 'true';
        break;
      case 'h3':
        newEl = document.createElement('h3');
        newEl.textContent = '新标题';
        newEl.contentEditable = 'true';
        break;
      case 'figure':
        newEl = createEmptyFigure();
        break;
      case 'hr':
        newEl = document.createElement('div');
        newEl.className = 'divider';
        newEl.style.cssText = 'border-top:1px solid rgba(200,151,58,0.18); margin:24px 0;';
        break;
      case 'aside':
        newEl = document.createElement('div');
        newEl.className = 'aside';
        newEl.innerHTML = '<div class="aside-label" contenteditable="true">NOTE</div><p contenteditable="true">旁注内容…</p>';
        break;
    }
    if (!newEl) return;
    inserterEl.after(newEl);
    insertedBlocks.push(newEl);
    // 新元素后面再加一个 inserter
    const nextIns = makeInserter(container);
    newEl.after(nextIns);
    // 重新分配 ID
    assignIds();
    // 聚焦
    if (newEl.contentEditable === 'true') {
      newEl.focus();
      // 选中全部占位文字
      const range = document.createRange();
      range.selectNodeContents(newEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function createEmptyFigure() {
    const fig = document.createElement('figure');
    fig.className = 'img-block';
    const placeholder = document.createElement('div');
    placeholder.className = 'em-upload-placeholder';
    placeholder.textContent = '📷 点击上传图片';
    placeholder.addEventListener('click', () => triggerFileUpload(fig));
    fig.appendChild(placeholder);
    const caption = document.createElement('figcaption');
    caption.textContent = '图片说明…';
    caption.contentEditable = 'true';
    fig.appendChild(caption);
    // 也给它加个 toolbar
    attachToolbarToFigure(fig);
    return fig;
  }

  /* ══════════════════════════════════════════════════════════════════
   * 图片工具栏
   * ══════════════════════════════════════════════════════════════════ */
  function attachImageToolbars() {
    document.querySelectorAll('figure').forEach(fig => {
      if (isExcluded(fig)) return;
      attachToolbarToFigure(fig);
    });
  }

  function attachToolbarToFigure(fig) {
    if (fig.querySelector('.em-img-toolbar')) return;
    const toolbar = document.createElement('div');
    toolbar.className = 'em-img-toolbar';
    toolbar.innerHTML = `
      <button class="em-img-tb-btn" data-action="replace" title="替换图片">📷</button>
      <button class="em-img-tb-btn" data-action="rotate-cw" title="顺时针旋转 90°">↻</button>
      <button class="em-img-tb-btn" data-action="rotate-ccw" title="逆时针旋转 90°">↺</button>
      <button class="em-img-tb-btn" data-action="toggle" title="横图 / 竖图切换">⇔</button>
      <button class="em-img-tb-btn" data-action="delete" title="删除图片">✕</button>
    `;
    toolbar.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      e.stopPropagation();
      handleImgAction(btn.dataset.action, fig);
    });
    fig.appendChild(toolbar);
  }

  function handleImgAction(action, fig) {
    switch (action) {
      case 'replace':  triggerFileUpload(fig); break;
      case 'rotate-cw':  rotateImage(fig.querySelector('img'), 90); break;
      case 'rotate-ccw': rotateImage(fig.querySelector('img'), -90); break;
      case 'toggle':     toggleFigureLayout(fig); break;
      case 'delete':
        if (confirm('确定删除这张图片？')) fig.remove();
        break;
    }
  }

  function toggleFigureLayout(fig) {
    if (fig.classList.contains('img-portrait')) {
      fig.classList.remove('img-portrait');
      showToast('横图模式');
    } else {
      fig.classList.add('img-portrait');
      showToast('竖图模式');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 图片上传 & 处理
   * ══════════════════════════════════════════════════════════════════ */
  function triggerFileUpload(fig) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      if (!input.files[0]) { input.remove(); return; }
      showToast('处理图片…', 3000);
      try {
        const processed = await processImage(input.files[0]);
        await uploadAndReplace(fig, processed);
      } catch (e) {
        showToast('上传失败：' + e.message);
      }
      input.remove();
    });
    input.click();
  }

  /** 客户端图片处理：缩放 + JPEG 压缩 */
  function processImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          // 缩放到最大边 IMG_MAX_DIM
          if (w > IMG_MAX_DIM || h > IMG_MAX_DIM) {
            if (w > h) { h = Math.round(h * IMG_MAX_DIM / w); w = IMG_MAX_DIM; }
            else       { w = Math.round(w * IMG_MAX_DIM / h); h = IMG_MAX_DIM; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', IMG_QUALITY);
          const base64 = dataUrl.split(',')[1];
          // 生成文件名
          const stem = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
          const filename = stem + '_' + Date.now() + '.jpg';
          resolve({ base64, filename, width: w, height: h });
        };
        img.onerror = () => reject(new Error('无法读取图片'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });
  }

  /** 上传到服务器并更新 DOM */
  async function uploadAndReplace(fig, processed) {
    const dir = photoDir();
    const resp = await fetch('/em-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dir: dir.replace(/^\//, ''),
        filename: processed.filename,
        base64: processed.base64,
      }),
    });
    if (!resp.ok) throw new Error('服务器返回 ' + resp.status);
    const result = await resp.json();

    // 移除占位符
    const placeholder = fig.querySelector('.em-upload-placeholder');
    if (placeholder) placeholder.remove();

    // 更新或创建 <img>
    let img = fig.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      const cap = fig.querySelector('figcaption');
      if (cap) fig.insertBefore(img, cap);
      else fig.prepend(img);
    }

    // 使用从当前页面到图片的相对路径
    img.src = relativeFrom(result.path) + '?t=' + Date.now();
    img.alt = processed.filename.replace(/_\d+\.jpg$/, '');

    // 自动判断横竖
    if (processed.height > processed.width * 1.1) {
      fig.classList.add('img-portrait');
    } else {
      fig.classList.remove('img-portrait');
    }

    showToast('图片已上传');
  }

  /* ══════════════════════════════════════════════════════════════════
   * 图片旋转
   * ══════════════════════════════════════════════════════════════════ */
  async function rotateImage(imgEl, degrees) {
    if (!imgEl) { showToast('无图片可旋转'); return; }
    const src = imgEl.getAttribute('src').split('?')[0];
    // 解析出绝对路径
    const absPath = new URL(src, location.href).pathname;
    try {
      const resp = await fetch('/em-rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath: absPath, degrees }),
      });
      if (resp.ok) {
        imgEl.src = src + '?t=' + Date.now();
        showToast('已旋转 ' + degrees + '°');
      } else {
        const data = await resp.json();
        showToast('旋转失败：' + (data.error || resp.status));
      }
    } catch (e) {
      showToast('旋转失败');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 拖拽上传
   * ══════════════════════════════════════════════════════════════════ */
  function setupDragDrop() {
    dropzone = document.createElement('div');
    dropzone.className = 'em-dropzone';
    dropzone.innerHTML = '<div class="em-dropzone-inner">📷 拖拽图片到此处上传</div>';
    document.body.appendChild(dropzone);

    let dragCount = 0;
    document.addEventListener('dragenter', e => {
      if (!active || !e.dataTransfer.types.includes('Files')) return;
      dragCount++;
      dropzone.classList.add('em-show');
    });
    document.addEventListener('dragleave', () => {
      if (!active) return;
      dragCount--;
      if (dragCount <= 0) { dropzone.classList.remove('em-show'); dragCount = 0; }
    });
    document.addEventListener('dragover', e => { if (active) e.preventDefault(); });
    document.addEventListener('drop', async e => {
      if (!active) return;
      e.preventDefault();
      dropzone.classList.remove('em-show');
      dragCount = 0;
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length === 0) return;

      // 找最近的可插入容器（或最后一个 section）
      const container = document.querySelector('.prose > section:last-of-type')
                     || document.querySelector('.event-body:last-of-type')
                     || document.querySelector('.wrap');
      if (!container) return;

      for (const file of files) {
        showToast('上传中…', 3000);
        try {
          const processed = await processImage(file);
          const fig = createEmptyFigure();
          container.appendChild(fig);
          insertedBlocks.push(fig);
          await uploadAndReplace(fig, processed);
        } catch (e) {
          showToast('上传失败：' + e.message);
        }
      }
      assignIds();
    });
  }

  /* ══════════════════════════════════════════════════════════════════
   * 进入 / 退出编辑模式
   * ══════════════════════════════════════════════════════════════════ */
  function enterEdit() {
    if (active) return;
    if (EM_PASSWORD) {
      const input = prompt('请输入编辑密码：');
      if (input !== EM_PASSWORD) { if (input !== null) showToast('密码错误'); return; }
    }
    active = true;
    originals = {};
    insertedBlocks = [];
    document.body.classList.add('em-active');

    // 快照 data-key 原始值
    captureDataKeyOriginals();

    // 使所有候选元素可编辑
    candidates().forEach(el => {
      const id = el.dataset.emId;
      if (id !== undefined) {
        originals[id] = el.innerHTML;
        el.contentEditable = 'true';
      }
    });

    // 使 data-key 元素可编辑
    document.querySelectorAll('[data-key]').forEach(el => {
      if (!isExcluded(el)) el.contentEditable = 'true';
    });

    // 使 figcaption 可编辑
    document.querySelectorAll('figcaption').forEach(el => {
      if (!isExcluded(el)) el.contentEditable = 'true';
    });

    // 注入 block inserter 和图片工具栏
    placeInserters();
    attachImageToolbars();

    btnEdit.style.display = 'none';
    btnSave.style.display = '';
    btnCancel.style.display = '';
  }

  async function exitEdit(save) {
    if (!active) return;
    active = false;
    document.body.classList.remove('em-active');

    if (!save) {
      // 恢复原始内容
      candidates().forEach(el => {
        const id = el.dataset.emId;
        if (id !== undefined && originals[id] !== undefined) {
          el.innerHTML = originals[id];
        }
        el.removeAttribute('contenteditable');
      });
      // 恢复 data-key 原始值
      document.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (originalDataKeys[key] !== undefined) el.innerHTML = originalDataKeys[key];
        el.removeAttribute('contenteditable');
      });
      // 移除新插入的块
      insertedBlocks.forEach(el => { if (el.parentNode) el.remove(); });
    } else {
      // 移除所有 contenteditable
      document.querySelectorAll('[contenteditable]').forEach(el => {
        el.removeAttribute('contenteditable');
      });
    }

    // 清理编辑模式 UI
    document.querySelectorAll('.em-inserter, .em-img-toolbar, .em-picker').forEach(el => el.remove());

    originals = {};
    originalDataKeys = {};
    insertedBlocks = [];
    btnEdit.style.display = '';
    btnSave.style.display = 'none';
    btnCancel.style.display = 'none';

    if (save) {
      await persistSave();
    } else {
      showToast('已取消');
    }
  }

  /* ══════════════════════════════════════════════════════════════════
   * 构建 UI & 初始化
   * ══════════════════════════════════════════════════════════════════ */
  function buildUI() {
    // FAB 按钮组
    fab = document.createElement('div');
    fab.className = 'em-fab';

    btnEdit = document.createElement('button');
    btnEdit.className = 'em-btn';
    btnEdit.textContent = '✏ 编辑';
    btnEdit.addEventListener('click', enterEdit);

    btnSave = document.createElement('button');
    btnSave.className = 'em-btn em-save';
    btnSave.textContent = '💾 保存';
    btnSave.style.display = 'none';
    btnSave.addEventListener('click', () => exitEdit(true));

    btnCancel = document.createElement('button');
    btnCancel.className = 'em-btn em-cancel';
    btnCancel.textContent = '✕ 取消';
    btnCancel.style.display = 'none';
    btnCancel.addEventListener('click', () => exitEdit(false));

    fab.appendChild(btnSave);
    fab.appendChild(btnCancel);
    fab.appendChild(btnEdit);

    toast = document.createElement('div');
    toast.className = 'em-toast';

    document.body.appendChild(fab);
    document.body.appendChild(toast);

    // 拖拽上传
    setupDragDrop();

    // 等待 data-bind 完成后再分配 ID
    let ready = false;
    function onReady() {
      if (ready) return;
      ready = true;
      assignIds();
      setTimeout(restoreSaved, 50);
    }
    if (document.querySelector('[data-key]')) {
      document.addEventListener('data-bind-ready', onReady, { once: true });
      setTimeout(onReady, 800); // fallback
    } else {
      assignIds();
      setTimeout(restoreSaved, 120);
    }
  }

  /* ── Init ─────────────────────────────────────────────────────── */
  injectCSS();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
}());
