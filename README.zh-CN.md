# Logseq DB Favorite Tree

[English README](./README.md)

基于 Logseq DB 图谱与页面属性关系构建的“收藏夹树”插件。

## 项目定位

- 以 Logseq 收藏页作为树根入口
- 以页面属性关系构建层级，默认属性名为 `parent`
- 以悬浮面板 / 悬浮球形式提供常驻导航能力
- 面向 `DB graph` 设计，不支持 `file graph`

## 功能概览

- 收藏页自动作为根节点加载
- 页面层级自动解析并支持懒加载展开
- 当前页高亮、当前页定位、多路径展开
- 树内搜索、祖先路径保留、面包屑跳转
- 面板拖动、缩放、收回悬浮球、位置与尺寸记忆
- 功能区收起 / 展开、自动刷新控制、手动刷新
- 默认标题排序与同级拖拽自定义排序
- 面板文案跟随 Logseq 语言切换自动刷新，未覆盖文案回退英文
- 不同 graph 独立记忆展开状态、布局、排序与视图模式

## 从 Marketplace 安装

1. 在 Logseq 中打开 `Marketplace`
2. 搜索 `DB Favorite Tree`
3. 安装并启用插件
4. 至少收藏一个页面作为根节点
5. 给需要纳入树的子页面添加 `parent` 属性

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

### 2. 配置层级属性

- 默认层级属性名是 `parent`
- 在子页面中添加 `parent` 属性，并把值设置为另一个页面
- 设置后，子页面就会展示在对应父页面下面

示例：

```text
页面：周计划
属性名：parent
属性值：[[项目管理]]
```

### 3. 配置多个父页面

- `parent` 属性可以包含多个页面引用
- 一个页面有多个父页面时，会同时出现在多条路径中

## 日常使用

- 从工具栏图标打开悬浮面板
- 展开节点以懒加载子页面
- 用搜索框筛选结果并保留祖先路径
- 使用“定位当前页”展开当前页所在的所有匹配路径
- 拖动同级节点以保存自定义顺序

## 插件设置

- `层级属性名`：用于声明父页面关系，默认 `parent`
- `面板宽度`：悬浮面板默认宽度，单位像素
- `自动刷新间隔（秒）`：轮询刷新间隔，默认 `60`
- `初始侧向偏好`：首次展示时默认靠左或靠右

说明：

- 自动刷新默认关闭
- 开启后按 `60` 秒间隔轮询，可在设置中修改

## 限制说明

- 仅支持 `DB graph`
- 不支持 `file graph`
- 根节点来自收藏页面
- 拖拽排序仅支持同级节点之间重排
- 搜索状态下禁用拖拽排序

## 截图与演示

- 提交 Marketplace 前，请至少补充 1 张截图或 1 个 GIF
- 建议展示：面板展开态、悬浮球态、搜索结果、`parent` 层级配置效果

## 文档导航

- [英文 README](./README.md)
- [英文使用指南](./docs/user-guide.en.md)
- [使用指南](./docs/user-guide.md)
- [发布指南](./docs/publish-guide.md)
- [详细功能清单](./docs/feature-list.md)
- [技术方案文档](./docs/technical-design.md)
- [Marketplace Manifest 示例](./docs/marketplace-manifest.example.json)
- [Marketplace PR 模板](./docs/marketplace-pr-template.md)

## 代码结构

- `src/main.ts`：插件启动入口，负责初始化与装配
- `src/plugin.ts`：主协调层，负责编排刷新、状态切换与生命周期
- `src/tree-service.ts`：收藏根解析、属性归一化与树路径能力
- `src/floating-layout.ts`：面板 / 悬浮球布局、拖拽、缩放与吸附
- `src/render.ts`：纯渲染层，负责生成面板与树节点 HTML
- `src/settings.ts`：插件设置与 graph 级内部状态持久化
- `src/wire-dom-events.ts`：DOM 事件分发与拖拽排序接线
- `src/toolbar.ts`：Logseq 工具栏入口注册
- `src/utils.ts` / `src/theme.ts` / `src/constants.ts` / `src/types.ts`：工具、主题、常量与类型

## 开发说明

- 当前实现面向 `DB graph`，已在 `package.json` 中声明不支持 `file graph`
- 属性解析采用“直接属性 + 引用对象 + 数组值”归一化策略，以兼容不同 DB 返回结构
- 属性键除支持字面 `parent` 外，也兼容 DB 内部属性键格式
- 若收藏夹 API 返回结构存在差异，插件会尽量归一化为页面标题列表
