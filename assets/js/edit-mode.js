/**
 * edit-mode.js — 页面内联编辑模式
 * 全站共享脚本，在所有页面引入
 * 功能：点击"✏ 编辑"进入编辑模式，修改后保存到 localStorage
 */
(function () {
  'use strict';

  /* ── 密码保护 ─────────────────────────────────────────────────────
   * 在下面填入你的密码（字符串）。
   * 留空 '' 则不需要密码。
   * ──────────────────────────────────────────────────────────────── */
  const EM_PASSWORD = '';

  /* ── CSS ─────────────────────────────────────────────────────────── */
  const CSS = `
    .em-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9000;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
    }
    .em-btn {
      padding: 8px 18px;
      border-radius: 3px;
      border: 1px solid rgba(200,151,58,0.45);
      background: rgba(14,12,9,0.90);
      color: #c8973a;
      font-family: 'Cinzel', 'Noto Serif SC', serif;
      font-size: 11.5px;
      letter-spacing: 0.09em;
      cursor: pointer;
      transition: background 0.18s, border-color 0.18s, color 0.18s;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      white-space: nowrap;
      user-select: none;
    }
    .em-btn:hover {
      background: rgba(200,151,58,0.14);
      border-color: #c8973a;
    }
    .em-btn.em-save {
      background: rgba(200,151,58,0.18);
      border-color: rgba(200,151,58,0.8);
    }
    .em-btn.em-save:hover {
      background: rgba(200,151,58,0.28);
    }
    .em-btn.em-cancel {
      border-color: rgba(180,80,80,0.45);
      color: #b07070;
    }
    .em-btn.em-cancel:hover {
      background: rgba(180,80,80,0.12);
      border-color: rgba(180,80,80,0.8);
      color: #c07070;
    }
    /* 编辑模式顶部横幅 */
    body.em-active::before {
      content: '✏  编辑模式  —  修改任意文字后点击「保存」';
      position: fixed;
      top: 0; left: 0; right: 0;
      z-index: 8999;
      background: rgba(200,151,58,0.10);
      border-bottom: 1px solid rgba(200,151,58,0.25);
      color: rgba(200,151,58,0.75);
      font-family: 'Cinzel', 'Noto Serif SC', serif;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-align: center;
      padding: 5px 0;
      pointer-events: none;
    }
    /* 可编辑元素高亮 */
    body.em-active [data-em-id] {
      outline: none;
      border-radius: 2px;
      transition: box-shadow 0.15s, background 0.15s;
    }
    body.em-active [data-em-id]:hover {
      box-shadow: 0 0 0 1px rgba(200,151,58,0.35);
      cursor: text;
    }
    body.em-active [data-em-id]:focus {
      box-shadow: 0 0 0 2px rgba(200,151,58,0.65);
      background: rgba(200,151,58,0.04);
    }
    /* Toast 提示 */
    .em-toast {
      position: fixed;
      bottom: 80px;
      right: 28px;
      z-index: 9001;
      background: rgba(14,12,9,0.94);
      border: 1px solid rgba(200,151,58,0.55);
      color: #c8973a;
      font-family: 'Cinzel', serif;
      font-size: 11.5px;
      letter-spacing: 0.12em;
      padding: 8px 16px;
      border-radius: 3px;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.25s, transform 0.25s;
      pointer-events: none;
    }
    .em-toast.em-show {
      opacity: 1;
      transform: translateY(0);
    }
  `;

  /* ── 排除祖先选择器 ────────────────────────────────────────────── */
  const EXCLUDE = [
    // 导航 / 面包屑 / 页脚
    'nav', '.site-nav', '.page-nav', '.breadcrumb', '.context-strip', 'footer',
    // 按钮 / 链接 / 标签
    'a', 'button', '.btn', '.tag', '.era-pill', '.filter-pill',
    // Day1 think 动态容器
    '#pantheon-grid', '#blessings-grid', '#myth-cards',
    '#domain-filters', '#relation-canvas-wrap', '#stars',
    // Day2 think 动态容器
    '#pharaoh-grid', '#era-filters', '#dynasty-rail',
    '#pharaoh-dots', '#era-details', '#papyrus-origin-grid', '#event-cards',
    // 通用动态 / Modal
    '.modal', '#modal', '#modal-overlay', '#modal-header', '#modal-body',
    '.filter-pills', '.tab-nav', '.em-fab',
    // 数据绑定字段（只能通过 data/days.json 修改）
    '[data-key]',
  ];

  /* ── 候选可编辑选择器 ────────────────────────────────────────── */
  // 不限定 main（全站页面用 .wrap 而非 <main>），排除逻辑由 EXCLUDE 处理
  const EDITABLE_SEL = 'h1, h2, h3, h4, p, li, blockquote';

  /* ── 状态 ────────────────────────────────────────────────────── */
  let active = false;
  let originals = {};   // { id: innerHTML }
  let fab, btnEdit, btnSave, btnCancel, toast;

  const storageKey = () => 'em_v1_' + location.pathname;

  /* ── 工具函数 ────────────────────────────────────────────────── */
  function isExcluded(el) {
    return EXCLUDE.some(sel => {
      try { return el.closest(sel) !== null; } catch (e) { return false; }
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

  /* ── 保存 / 恢复 ─────────────────────────────────────────────── */
  function assignIds() {
    candidates().forEach((el, i) => {
      el.dataset.emId = String(i);
    });
  }

  /** 生成干净的 HTML（移除 edit-mode 注入的元素和临时属性） */
  function getCleanHTML() {
    const clone = document.documentElement.cloneNode(true);
    ['#em-styles', '.em-fab', '.em-toast'].forEach(sel => {
      const el = clone.querySelector(sel);
      if (el) el.remove();
    });
    clone.querySelectorAll('[data-em-id]').forEach(el => {
      el.removeAttribute('data-em-id');
      el.removeAttribute('contenteditable');
    });
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  async function persistSave() {
    // 始终先存 localStorage（离线备份 / GitHub Pages 降级）
    const data = {};
    candidates().forEach(el => {
      if (el.dataset.emId !== undefined) {
        data[el.dataset.emId] = el.innerHTML;
      }
    });
    localStorage.setItem(storageKey(), JSON.stringify(data));

    // 尝试写回源文件（仅本地 dev server 有此端点）
    try {
      const resp = await fetch('/em-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: location.pathname, html: getCleanHTML() }),
      });
      showToast(resp.ok ? '✓ 已写入文件' : '✓ 已保存（本地）');
    } catch (e) {
      // GitHub Pages 或其他静态托管：正常降级
      showToast('✓ 已保存（本地）');
    }
  }

  function restoreSaved() {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      candidates().forEach(el => {
        const id = el.dataset.emId;
        if (id !== undefined && data[id] !== undefined) {
          el.innerHTML = data[id];
        }
      });
    } catch (e) { /* 忽略损坏数据 */ }
  }

  /* ── Toast ────────────────────────────────────────────────────── */
  function showToast(msg, duration) {
    toast.textContent = msg;
    toast.classList.add('em-show');
    setTimeout(() => toast.classList.remove('em-show'), duration || 1800);
  }

  /* ── 进入 / 退出编辑模式 ──────────────────────────────────────── */
  function enterEdit() {
    if (active) return;
    // 密码校验（EM_PASSWORD 不为空时生效）
    if (EM_PASSWORD) {
      const input = prompt('请输入编辑密码：');
      if (input !== EM_PASSWORD) {
        if (input !== null) showToast('密码错误');
        return;
      }
    }
    active = true;
    originals = {};
    document.body.classList.add('em-active');

    candidates().forEach(el => {
      const id = el.dataset.emId;
      if (id !== undefined) {
        originals[id] = el.innerHTML;
        el.contentEditable = 'true';
      }
    });

    btnEdit.style.display = 'none';
    btnSave.style.display = '';
    btnCancel.style.display = '';
  }

  async function exitEdit(save) {
    if (!active) return;
    active = false;
    document.body.classList.remove('em-active');

    candidates().forEach(el => {
      if (!save && el.dataset.emId !== undefined) {
        const id = el.dataset.emId;
        if (originals[id] !== undefined) el.innerHTML = originals[id];
      }
      el.removeAttribute('contenteditable');
    });

    originals = {};
    btnEdit.style.display = '';
    btnSave.style.display = 'none';
    btnCancel.style.display = 'none';

    if (save) {
      await persistSave();   // toast 由 persistSave 内部显示
    } else {
      showToast('已取消');
    }
  }

  /* ── 构建 UI ──────────────────────────────────────────────────── */
  function buildUI() {
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

    // 先分配 ID，再延迟恢复（等 think 页 JS 渲染完毕）
    assignIds();
    setTimeout(restoreSaved, 120);
  }

  /* ── Init ─────────────────────────────────────────────────────── */
  injectCSS();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUI);
  } else {
    buildUI();
  }
}());
