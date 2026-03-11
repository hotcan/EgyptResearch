# EgyptResearch · 埃及旅行手记

2026 年 2 月 22 日 – 3 月 4 日，十一天埃及之旅的完整记录。

路线：中国 ✈ 开罗 → 亚历山大 → 开罗 ✈ 卢克索 ✈ 沙姆沙伊赫 ✈ 开罗 ✈ 中国

## 内容概览

41 个页面，141 张实拍照片，覆盖全部 11 天。每天由三个维度构成：

| 维度 | 内容 | 示例 |
|------|------|------|
| **历史 · History** | 历史背景与知识整理 | 古埃及众神关系、金字塔演变、卢克索神庙史 |
| **行程 · Action** | 时间线相册，带照片与图注 | 萨拉丁城堡、吉萨金字塔、帝王谷、红海浮潜 |
| **思考 · Think** | 个人观察与反思 | 宗教对比、建筑哲学、地缘政治、旅途总结 |

每个页面底部均有**评论区**（Firebase Firestore），访客可留言互动。

## 目录结构

```text
.
├── index.html                  # 首页（路线图 + 11 天卡片索引）
├── days/
│   ├── day1/                   # 第一天：出发路上
│   │   ├── index.html          # 概览（链接到三个子页面）
│   │   ├── history/index.html  # 历史：古埃及众神关系可视化
│   │   ├── action/index.html   # 行程：时间线相册
│   │   └── think/index.html    # 思考
│   ├── day2/ ... day8/         # 第二至八天（同上结构）
│   ├── day9/                   # 第九天（概览 + 思考）
│   ├── day10/                  # 第十天（完整四页）
│   └── day11/                  # 第十一天：归途（概览 + 总结）
├── data/
│   └── days.json               # 元数据（标题、日期、描述）
├── assets/
│   ├── css/comments.css        # 评论区样式
│   └── js/
│       ├── data-bind.js        # 数据绑定（从 days.json 注入页面）
│       ├── edit-mode.js        # 本地 CMS 编辑器（仅 localhost）
│       ├── firebase-config.js  # Firebase 项目配置
│       └── comments.js         # 评论功能（表单 + 验证码 + Firestore）
├── tools/
│   └── save-server.js          # 本地开发服务器（支持 CMS 保存）
├── generate_ppt.py             # PPT 生成脚本（python-pptx）
└── egypt-trip.pptx             # 生成的 27 页分享用 PPT
```

## 本地开发

```bash
node tools/save-server.js       # 启动本地服务器（端口 3000）
open http://localhost:3000      # 打开浏览器
```

localhost 下会自动激活页面右下角的「编辑」按钮，支持行内编辑文字和上传图片。

## 评论系统

评论使用 Firebase Firestore 存储，需要：

1. 在 [Firebase 控制台](https://console.firebase.google.com) 创建项目
2. 启用 Firestore Database（test mode）
3. 注册 Web App，将 config 填入 `assets/js/firebase-config.js`

评论表单包含姓名、邮箱和数学验证码（防机器人）。

## PPT 分享

```bash
pip install python-pptx Pillow
python generate_ppt.py          # 生成 egypt-trip.pptx（27 页，约 30 MB）
```

## 技术栈

- 纯静态 HTML/CSS/JS，无构建工具
- 深色金主题（`#0e0c09` 背景 + `#c8973a` 金色）
- Google Fonts：Cinzel + Noto Serif SC
- Firebase Firestore（评论存储）
- python-pptx + Pillow（PPT 生成）
