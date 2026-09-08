# Logseq DB Favorite Tree

[English README](./README.md)

基于 Logseq DB 图谱与页面属性关系构建的“收藏夹树”插件。

## 项目定位

- 以 Logseq 收藏页作为树根入口
- 以页面属性关系构建层级，默认属性名为 **`Page Tags`**（中文界面显示为 **`页面标签`**），智能兼容 `parent`、`tags`、`page-tags`
- 支持右键 / `···` 快速上下文菜单（在右侧边栏打开、新建子页面、复制引用/名称、展开/折叠、重置排序）
- 支持 `sidebar`、`floating`、`mixed` 三种显示模式
- 默认优先使用 Logseq 原生侧边栏模式
- 面向 `DB graph` 设计，不支持 `file graph`

## 功能概览

- 收藏页自动作为根节点加载
- 页面层级自动解析并支持懒加载展开，完美适配 Logseq DB 原生 `Page Tags` 实体属性体系
- **右键 / `···` 悬浮上下文操作菜单**：光标跟随弹出，集成 7 项核心能力（在右侧边栏打开、新建子页面、复制页面引用、复制页面名称、展开所有子级、折叠所有子级、恢复默认排序）
- **100% 全自动干净新建子页面**：一键输入标题回车即可创建子页面并完成 `Page Tags` 实体关系绑定，自动展开并高亮，**不产生任何多余的空白块（• 空白 Bullet）**
- **5 层容灾剪贴板引擎**：Electron 原生接口 -> 宿主异步剪贴板 -> 插件异步剪贴板 -> 宿主 DOM execCommand -> 插件 DOM execCommand，彻底解决 iframe 沙盒与脱焦环境下的复制失效
- **实时活动页高亮与路径自动展开**：无论在树内点击打开页面，还是在 Logseq 内部跳转（搜索、超链接导航触发路由变更），当前页面在树中实时高亮并自动展开所在祖先路径
- Datascript 批量拉取极速建索引（~20ms 级），双缓冲无感原子置换，无白屏闪烁
- 智能 DB 事务过滤：正文打字、敲回车换行分块、缩进移动零干扰，仅在页面标签/层级属性变更时实时刷新
- 叶子节点不显示无意义的展开标识
- 支持原生侧边栏树渲染，并补齐搜索、定位、展开/折叠全部、刷新、设置等能力
- 支持悬浮面板、悬浮球与混合模式切换
- 支持树内搜索、祖先路径保留、关键词高亮
- 支持当前页高亮、当前页定位、多路径展开与面包屑跳转
- 支持默认标题排序与同级拖拽自定义排序
- 不同 graph 独立记忆布局、展开状态、排序、功能区状态与显示模式
- 面板文案跟随 Logseq 语言切换自动刷新，未覆盖文案回退英文

## 从 Marketplace 安装

1. 在 Logseq 中打开 `Marketplace`
2. 搜索 `DB Favorite Tree`
3. 安装并启用插件
4. 至少收藏一个页面作为根节点
5. 直接在树上右键选择「新建子页面」，或为现有子页面添加 `Page Tags` 属性

## 从源码安装

### 1. 安装依赖

```bash
npm install
```

### 2. 构建插件

```bash
npm run build
```

### 3. 加载到 Logseq

1. 在 Logseq 中开启开发者模式
2. 选择 `Load unpacked plugin`
3. 指向当前项目目录
4. 在工具栏点击插件图标打开收藏树

## 首次配置

### 1. 准备根节点页面

- 把一个或多个页面加入 Logseq 收藏
- 被收藏的页面会作为树的根节点

### 2. 建立页面层级（两种方式）

**方式一：右键一键新建（推荐 ⭐）**
- 在任意树节点上**点击鼠标右键**（或点击悬停出现的 `···` 按钮）
- 点击 **「新建子页面」**，输入标题按回车，即可全自动创建页面并绑定层级

**方式二：在页面属性中手动添加**
- 默认层级属性名为 `Page Tags`（页面标签）
- 在子页面顶部添加属性 `Page Tags`，并将值选为父页面
- 插件也智能兼容 `parent` 与 `tags`

示例：

```text
页面：周计划
页面标签 (Page Tags)：[[项目管理]]
```

### 3. 配置多个父页面

- `Page Tags` 属性可以包含多个页面引用
- 一个页面有多个父页面时，会同时出现在多条路径中

## 显示模式

- `sidebar`：仅在 Logseq 原生左侧边栏展示树
- `floating`：仅使用悬浮面板与悬浮球
- `mixed`：允许在原生侧边栏与悬浮面板之间切换
- 默认预设为 `sidebar`
- `mixed` 模式初始化时也会优先展示侧边栏

## 日常使用

- 从工具栏图标打开收藏树
- 日常常驻导航优先使用原生侧边栏模式
- 需要拖动、缩放或悬浮球时切到悬浮模式
- 展开节点以懒加载子页面
- 右键点击树节点使用「在右侧边栏打开」进行分屏对照，或复制页面引用 `[[...]]`
- 用搜索框筛选结果并保留祖先路径
- 使用“定位当前页”展开当前页所在的所有匹配路径
- 在非搜索状态下拖动同级节点保存自定义顺序

## 插件设置

- `层级属性名`：用于声明父页面关系，默认 `Page Tags`（自动兼容 `页面标签`、`parent`、`tags`）
- `面板宽度`：悬浮面板默认宽度，单位像素
- `自动刷新间隔（秒）`：轮询刷新间隔，默认 `60`
- `初始侧向偏好`：悬浮模式首次展示时默认靠左或靠右
- `显示模式预设`：可选 `sidebar`、`floating`、`mixed`

说明：

- 自动刷新默认关闭
- 开启后按 `60` 秒间隔轮询，可在设置中修改
- 固定为 `sidebar` 或 `floating` 时，不显示模式切换按钮

## 限制说明

- 仅支持 `DB graph`
- 不支持 `file graph`
- 根节点来自收藏页面
- 拖拽排序仅支持同级节点之间重排
- 搜索状态下禁用拖拽排序
- 插件只读取层级关系，不会改写 Logseq 原始父子结构

## 截图与演示

![演示](./docs/2026-04-26.gif)

## 文档导航

- [英文 README](./README.md)
- [英文使用指南](./docs/user-guide.en.md)
- [使用指南](./docs/user-guide.md)
- [发布指南](./docs/publish-guide.md)
- [详细功能清单](./docs/feature-list.md)
- [产品路线图 PRD](./docs/product-roadmap-prd.md)
- [UI/UX 优化计划](./docs/ux-optimization-plan.md)
- [技术方案文档](./docs/technical-design.md)
- [版本更新记录](./CHANGELOG.md)
- [Release 升级说明模板](./docs/release-notes-template.md)
- [Marketplace Manifest 示例](./docs/marketplace-manifest.example.json)
- [Marketplace PR 模板](./docs/marketplace-pr-template.md)

## Marketplace 说明

- GitHub 仓库：`https://github.com/yanhaizhe/logseq-db-favorite-tree`
- GitHub Release 页面需附带自定义构建 zip 资产
- 仓库至少准备 1 张截图或 1 个 GIF
- Marketplace 清单建议声明 `supportsDB: true` 与 `supportsDBOnly: true`

## 代码结构

- `src/main.ts`：插件启动入口，负责初始化与装配
- `src/plugin.ts`：主协调层，负责编排刷新、显示模式、状态切换与生命周期
- `src/db-change.ts`：DB 事务过滤与变更检测，智能屏蔽编辑打字噪音，精准识别属性与标签变化
- `src/sidebar-render.ts`：原生侧边栏树渲染与宿主样式
- `src/tree-service.ts`：收藏根解析、Datascript 极速建索引、属性归一化与树路径能力
- `src/floating-layout.ts`：面板 / 悬浮球布局、拖拽、缩放与吸附
- `src/render.ts`：悬浮面板与树节点渲染
- `src/settings.ts`：插件设置与 graph 级内部状态持久化
- `src/wire-dom-events.ts`：DOM 事件分发与拖拽排序接线
- `src/toolbar.ts`：Logseq 工具栏入口注册
- `src/utils.ts` / `src/theme.ts` / `src/constants.ts` / `src/types.ts`：工具、主题、常量与类型

## 开发说明

- 当前实现面向 `DB graph`，已在 `package.json` 中声明不支持 `file graph`
- 属性解析采用“直接属性 + 引用对象 + 数组值”归一化策略，以兼容不同 DB 返回结构
- 属性键除支持字面 `parent` 外，也兼容 DB 内部属性键格式
- 若收藏夹 API 返回结构存在差异，插件会尽量归一化为页面标题列表
