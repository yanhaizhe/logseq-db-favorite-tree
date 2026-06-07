---
project_name: 'logseq-db-favorite-tree'
user_name: 'Yanhaizhe'
date: '2026-05-12'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 31
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 语言 | TypeScript | 6.0.3 | target ES2020, strict: true |
| 构建 | Vite | 8.0.10 | base './', moduleResolution Bundler |
| 运行时 | Logseq Plugin | — | iframe 环境，`@logseq/libs` 0.3.3（**externalized**） |
| CSS | 自定义 | — | 全部使用 Logseq CSS 变量，零硬编码色值 |
| 模块 | ESNext | — | `"type": "module"` |
| 存储 | logseq.updateSettings | — | graph-key 隔离的 JSON 持久化 |
| Node | >=24.0.0 | — | 仅构建时使用，不影响插件运行时 |

---

## Critical Implementation Rules

### 1. Language-Specific Rules（TypeScript）

**严格的 import 规范：**
- 始终使用 `type` 关键字导入仅作类型用途的模块：`import type { ThemeMode } from '@logseq/libs/dist/LSPlugin'`
- 不从 `@logseq/libs` 导入任何内部子路径（如 `@logseq/libs/dist/LSPlugin` 的类型除外）——实际运行时由 Logseq 宿主注入全局 `logseq` 对象
- 不使用 barrel export；每个文件对外导出是显式且精确的

**严格模式与类型安全：**
- `tsconfig.json` 中 `strict: true` 已开启，所有代码必须通过 `tsc --noEmit`
- `noUnusedLocals: false` 和 `noUnusedParameters: false` 仅因为构建管线兼容性而关闭；实际代码中不应有无用变量
- 每个文件都是独立模块（`isolatedModules: true`），禁止使用全局类型或全局变量污染

**空值处理：**
- 不依赖 optional chaining 作为唯一保护；关键路径上使用显式的 `null` 检查提前 return
- HTML 元素查找结果（`getElementById`、`querySelector`）始终检查是否为 null
- 类型守卫函数（如 `asSidebarSearchInput`、`asCreateChildInput`）用于安全的类型收窄

**异步模式：**
- 所有 Logseq API 调用都是异步的，必须 `await` 或使用 `.catch()`
- 顶层 `async` 只在 `logseq.ready(main).catch(...)` 入口处使用
- `void` 关键字用于表示"有意不 await"的 fire-and-forget 调用，例如 `void plugin.init()`

### 2. Framework-Specific Rules（Logseq Plugin）

**插件入口结构：**
- 入口文件 `src/main.ts`，唯一职责：组装依赖并启动 `FavoriteTreePlugin`
- 所有插件能力通过 `logseq.App`、`logseq.Editor`、`logseq.DB`、`logseq.UI` 等命名空间访问
- 设置 schema 在 `main()` 开始时通过 `logseq.useSettingsSchema()` 注册，确保先于任何设置读取

**构建约束：**
- `vite.config.ts` 中 `@logseq/libs` 必须保持为 `rollupOptions.external`
- 输出目录为 `dist/`，入口 HTML 通过 `./assets/` 相对路径引用 JS/CSS
- 发布 zip 中 `package.json` 的 `logseq.main` 从 `dist/index.html` 改为 `index.html`（由 publish.yml 中的 sed 完成）

**DB Graph 专用：**
- `package.json` 中 `logseq.unsupportedGraphType: "file"` — 插件不兼容 file graph
- 使用 `logseq.DB.onChanged()` 而不是文件监听
- 使用 `logseq.Editor.getAllPages()` 获取页面列表
- 使用 `logseq.Editor.getBlockProperty()` 和 `logseq.Editor.getBlockProperties()` 读取属性

**Main UI 模式：**
- 悬浮模式下通过 `logseq.setMainUIInlineStyle()` 和 `logseq.showMainUI()` 控制面板
- 侧边栏模式下通过 `logseq.provideUI()` 注入到宿主 DOM
- 始终使用 `requestAnimationFrame` 双层嵌套确保 DOM 已就绪再操作焦点

### 3. Code Organization & Architecture

**模块分层（6 层）：**
1. `main.ts` — 入口 + 组装
2. `plugin.ts` — 核心控制器（`FavoriteTreePlugin` class，~2000 行）
3. `settings.ts` / `tree-service.ts` / `floating-layout.ts` — 服务层
4. `render.ts` / `sidebar-render.ts` — 纯渲染函数（输入 state，输出 HTML 字符串）
5. `wire-dom-events.ts` — DOM 事件委托（`data-action` 属性驱动）
6. `types.ts` / `constants.ts` / `utils.ts` / `i18n.ts` / `theme.ts` — 横切层

**关键架构原则：**
- 渲染函数是纯函数，不持有状态，不访问 DOM
- 状态全部集中在 `FavoriteTreePlugin` 中，通过 `getRenderState()` 统一输出快照
- 所有事件处理通过 `wire-dom-events.ts` 的委托模式统一管理（基于 `data-action` 属性）
- 服务类（SettingsStore、TreeService、FloatingLayoutManager）是无副作用的数据/布局服务

**文件命名：**
- 全部使用 kebab-case：`wire-dom-events.ts`、`tree-service.ts`、`floating-layout.ts`
- CSS 文件为 `style.css`（单文件，使用 Logseq 变量）
- SVG 资源放在 `src/` 下

### 4. State Management & Persistence

**核心状态模型：**
- 展开状态：`expandedKeys: Set<string>`（已展开节点 key）
- 加载状态：`loadedKeys: Set<string>` + `loadStates: Map<string, LoadState>` + `loadErrors: Map<string, string>`
- 搜索状态：`searchQuery: string` + `searchMatchKeys: string[]` + `activeSearchMatchKey: string | null`
- 排序状态：`sortOrders: SortOrderMap` + `sortModes: SortModeMap`
- 布局状态：`FloatingLayoutManager` 内部管理位置和尺寸

**持久化规则：**
- 状态按 `graphKey`（图谱路径）隔离，切换图谱时自动切换状态集
- 通过 `logseq.updateSettings()` 将 graph-scoped 状态序列化为 JSON 字符串存入 `__graphStates` key
- 内部设置的 key 使用双下划线前缀 `__` 避免与用户可见设置冲突
- `persistInternalState()` 在每次状态变更后调用（展开/折叠、排序变更、布局变更等）

### 5. CSS & Theming Rules

**强制规则：**
- 所有颜色必须使用 `--ft-*` CSS 自定义属性（如 `--ft-bg`、`--ft-text`、`--ft-accent`），禁止硬编码色值
- `theme.ts` 负责从 Logseq 宿主 CSS 变量读取并映射为 `--ft-*`，附带明/暗双主题 fallback
- CSS 文件使用 BEM-lite 命名：`.favorite-tree__header`、`.favorite-tree__body`
- 使用 `data-role` 属性标记功能元素（如 `[data-role="search-input"]`），不依赖 class 做 JS 选择器

**主题同步流程：**
1. `logseq.App.onThemeModeChanged` 触发 `currentThemeMode` 更新
2. `syncTheme()` 调用 `applyTheme(mode)`，从 `window.parent` 读取 Logseq CSS 变量
3. 变量写入 `document.documentElement.style` 的 `--ft-*` 属性
4. `style.css` 中全部样式引用 `--ft-*` 变量，无需重新渲染

### 6. i18n / 国际化

- 自定义 i18n 系统（`src/i18n.ts` ~1127 行），不依赖第三方库
- 支持 en / zh-CN / zh-Hant / ja / ko / ru / fr / de / pl / af / es / nb-NO / pt-BR / tr / uk
- 未覆盖文案回退 en
- 翻译函数使用模板字面量语法：`i18n.t('refreshFailed', { message })` 支持参数插值
- 设置 schema 在 `buildSettingsSchema(i18n)` 中动态生成以支持多语言标题和描述
- 语言切换通过定时轮询检测（`startLocaleWatcher()`，1500ms 间隔），检测到变化后重新渲染
- **新增 i18n key 必须为所有语言提供翻译，否则回退 en**

### 7. Testing Rules

- 项目当前无自动化测试框架配置
- `test-script.js` 存在于根目录，可能用于手动验证脚本
- 如需添加测试，推荐使用 Vitest（与 Vite 生态一致）
- Mock 策略：应 mock `@logseq/libs` 的 `logseq` 全局对象而非真实调用 Logseq API

### 8. Development Workflow Rules

**构建流程：**
```bash
npm run build    # tsc --noEmit && vite build（生产构建）
npm run dev      # vite build --watch（开发模式）
```

**GitHub Release 打包（publish.yml）：**
1. `npm ci` 安装依赖
2. `npm run build` 构建
3. 打包 `README.md` + `icon.svg` + `package.json` + `dist/*` 为 zip
4. sed 修改 zip 内 `package.json` 将 main 从 `dist/index.html` 改为 `index.html`
5. zip 附加到 GitHub Release

**发布检查清单：**
- `package.json` 版本号已更新
- `README.md` / `README.zh-CN.md` 反映当前功能
- `CHANGELOG.md` 已补充本次版本内容
- `docs/` 下文档与实际交互一致
- 仓库中包含截图或 GIF

---

## Critical Don't-Miss Rules

### 绝对不能做的事：

1. **不要将 `@logseq/libs` 打包进构建产物** — 已在 vite.config.ts 中 externalize，任何时候都不要移除此配置
2. **不要在渲染函数中做 DOM 操作** — `render.ts` 和 `sidebar-render.ts` 只返回 HTML 字符串
3. **不要硬编码颜色值** — 所有颜色必须通过 `--ft-*` 变量，暗色主题兼容性依赖此规则
4. **不要跨域访问 `window.parent` 而不做 try/catch** — iframe 跨域场景会抛出异常，参见 `getHostDocument()` 和 `getHostWindow()` 的 defensive 实现
5. **不要使用 `@logseq/libs` 的内部子路径导入**（除类型外）— 运行时 API 全部由宿主注入的全局 `logseq` 对象提供
6. **不要直接修改页面属性做写操作** — 插件定位是只读展示，唯一例外是通过 `logseq.Editor.upsertBlockProperty()` 创建子页面时写入 parent 属性
7. **不要忘记 graph 隔离** — 所有持久化状态必须通过 graphKey 做命名空间隔离
8. **不要在 file graph 上使用** — 插件通过 `unsupportedGraphType: "file"` 已声明不兼容

### 关键边界情况：

- **搜索 + 刷新竞态**：搜索过程中触发刷新时，需检查搜索关键词是否已变化（`if (this.searchQuery !== nextQuery) return`）
- **渲染帧取消**：`renderFrameId` 保存 `requestAnimationFrame` 的返回值，在 `destroy()` 和下一帧前取消，避免在已销毁组件上渲染
- **定时器清理**：`destroy()` 中必须清理所有 7 个定时器 ID（renderFrame、searchRenderTimeout、refreshTimer、routeTimer、pollTimer、flashTimer、localeWatchTimer）
- **循环引用检测**：树路径查找中使用 `ancestors.includes(key)` 防止父子属性形成环
- **已删除页面过滤**：`isPageDeletedLike()` 检测 16 种可能的删除标记（deleted/isDeleted/trashed/archived 及其变体）
- **组合输入处理**：搜索输入在 `compositionstart` 期间暂停搜索，`compositionend` 后触发实际搜索

### Event Handler 关键提醒：

- 所有事件处理器使用 `readonly` arrow function 类属性（如 `private readonly handleBodyScroll = (): void => {...}`），确保 `this` 绑定正确
- DOM 事件通过 `wire-dom-events.ts` 委托到根元素，使用 `[data-action="..."]` 属性派发
- 新增交互必须在 `FavoriteTreeDOMHandlers` 类型中声明 handler，在 `main.ts` 中绑定，在 `wire-dom-events.ts` 中添加 action 分支

---

## Usage Guidelines

**For AI Agents:**
- 修改任何文件前先阅读此文件
- 严格遵循上述所有规则
- 不确定时选择更严格的选项
- 发现新模式时更新此文件

**For Humans:**
- 保持此文件精简，聚焦 Agent 需要的不明显规则
- 技术栈变更时更新
- 每季度检查过时规则
- 移除随时间变得显而易见的规则

Last Updated: 2026-05-12
