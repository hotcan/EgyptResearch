# EgyptResearch · 埃及旅行手记（Egypt Travel Journal）

一个以埃及旅行为主线的静态游记站点。

项目最初从“古埃及众神关系页面”开始，随后扩展为分日记录的旅行手记：把阅读笔记、课堂讲解、历史背景和现场照片放在同一套页面结构里，按“第一天、第二天……”持续更新。

## 项目内容

- 旅行目录首页（按天索引）
- 每日页面（以游记正文为主）
- `思考` 与 `行动` 双线记录
- 时间线相册样式（适合插入实拍照片与图注）
- 保留第一天的古埃及众神关系可视化页面作为“思考”部分

## 当前进度

- `第一天`：已完成正文与时间线相册（萨拉丁城堡、警察博物馆、军事博物馆、Nefertiti 奶茶）
- `第二天`：已完成游记风格正文（上午吉萨金字塔群，下午开罗老城）
- `第三天` ~ `第十一天`：已创建页面骨架，等待逐日补写

## 目录结构（简要）

```text
.
├── index.html                # 旅行手记首页（总目录）
├── days/
│   ├── day1/
│   │   ├── index.html        # 第一天总览
│   │   ├── think/index.html  # 古埃及众神关系页面（保留）
│   │   └── action/index.html # 第一天行动时间线相册
│   ├── day2/index.html       # 第二天游记正文（时间线相册）
│   └── day3 ... day11        # 预留页面
└── assets/
    └── day1/jpg/             # 第一天照片资源（由 HEIC 转换而来）
```

## 本地查看

```bash
open index.html   # macOS
```

或直接用浏览器打开 `/Users/hotcan/Downloads/EgyptResearch/index.html`。

## 图片处理（HEIC -> JPG）

项目中的第一天照片由 HEIC 转换为 JPG 后使用。当前验证通过的命令：

```bash
magick input.HEIC -auto-orient -quality 92 output.jpg
```

批量转换示例：

```bash
mkdir -p assets/day1/jpg
for f in *.HEIC; do
  magick "$f" -auto-orient -quality 92 "assets/day1/jpg/${f%.*}.jpg"
done
```

## 写作方向

这个仓库不是传统“景点攻略”，而是偏个人观察的旅行手记：

- 现场见闻（我看见了什么）
- 历史背景（这些地方曾经发生过什么）
- 个人感受（我在当下如何理解它）
- 照片图注（让图像和文字互相补充）

## 备注

- 页面均为纯 HTML/CSS，便于快速编辑与持续追加
- 后续可以继续把第二天及之后的页面补成实拍时间线相册
