# 发布指南

本文档用于将当前插件发布到 Logseq Marketplace，并整理 GitHub Release 升级说明。当前项目定位为 `DB graph only` 插件。

## 1. 发布前检查

- 确保 `package.json` 版本号已更新
- 确保 `npm run build` 可以通过
- 确保 `README.md` 与 `README.zh-CN.md` 已更新为当前功能
- 确保 `docs/user-guide.md` / `docs/user-guide.en.md` 与实际交互一致
- 确保 `CHANGELOG.md` 已补充本次版本内容
- 确保仓库中至少准备 1 张截图或 1 个 GIF
- 确保当前插件仅支持 `DB graph`

## 2. GitHub Release 自动打包

项目已提供 GitHub Actions 工作流：

- `.github/workflows/publish.yml`

用途：

- 在 GitHub 创建正式 `Release` 后自动安装依赖
- 自动执行 `npm run build`
- 自动打包发布所需文件为 zip
- 自动把 zip 附加到当前 Release

Release zip 中包含：

- `package.json`
- `README.md`
- `icon.svg`
- `dist/`

## 3. 建议的文档更新顺序

每次准备发版时，建议按下面顺序同步文档：

1. 更新 `README.md` 与 `README.zh-CN.md`
2. 更新 `docs/user-guide.md` 与 `docs/user-guide.en.md`
3. 更新 `docs/feature-list.md`（如功能范围有变化）
4. 更新 `CHANGELOG.md`
5. 使用 `docs/release-notes-template.md` 生成本次 GitHub Release 说明

## 4. 创建正式版本

### 4.1 更新版本号

例如：

- `1.0.0`
- `1.0.1`
- `1.1.0`

### 4.2 更新变更记录

在 `CHANGELOG.md` 中补充：

- 新增功能
- 改进行为
- 修复问题
- 不兼容变更（如有）

建议优先从“用户能感知到的变化”来写，而不是只写内部代码细节。

### 4.3 提交并打标签

```bash
git add .
git commit -m "release: v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

### 4.4 创建 GitHub Release

1. 打开 GitHub 仓库
2. 进入 `Releases`
3. 选择 `Draft a new release`
4. 选择刚刚推送的 tag，例如 `v1.0.0`
5. 参考 `docs/release-notes-template.md` 填写版本说明
6. 发布 Release
7. 等待 GitHub Actions 完成自动打包

发布后检查：

- Release 页面中存在自定义 zip 附件
- 不是只看到 GitHub 默认的 `Source code (zip)`
- Release 标题、Tag、`package.json` 版本一致

## 5. GitHub Release 升级说明写法建议

建议结构：

- `Highlights` / `本次重点`
- `Added` / `新增`
- `Improved` / `优化`
- `Fixed` / `修复`
- `Notes` / `已知说明`

建议内容：

- 优先写用户可感知的升级，例如原生侧边栏、搜索改进、模式切换、排序、tooltip 体验
- 每条尽量短句，避免只写文件名或内部重构描述
- 如果是 DB-only 插件，可在说明中再次强调仅支持 `DB graph`

## 6. Marketplace 清单

示例文件：

- `docs/marketplace-manifest.example.json`

提交到 `logseq/marketplace` 时，需要在对方仓库创建：

```text
packages/db-favorite-tree/manifest.json
```

建议内容：

- `supportsDB: true`
- `supportsDBOnly: true`
- `effect: false`

当前示例已按当前仓库地址预填：

- `author: "yanhaizhe"`
- `repo: "yanhaizhe/logseq-db-favorite-tree"`

如需迁移到其他仓库，再替换为你的真实 GitHub 信息。

## 7. Marketplace 提交流程

1. Fork `logseq/marketplace`
2. 在 `packages/` 下新建插件目录
3. 新增 `manifest.json`
4. 提交到自己的 fork
5. 发起 Pull Request

建议在 PR 中明确说明：

- 插件仅支持 `DB graph`
- GitHub Release 已附带构建 zip
- README 已包含使用方式与显示模式说明
- 已提供截图或 GIF
- Changelog 与 Release Notes 已同步更新

## 8. 当前项目建议

对于本项目，建议保持以下声明一致：

- `package.json` 中保留 `unsupportedGraphType: "file"`
- Marketplace 中设置 `supportsDB: true`
- Marketplace 中设置 `supportsDBOnly: true`
- README、用户指南、Release Notes 中都明确写出 `DB graph only`

## 9. 常见驳回原因

- 没有自定义发布 zip
- README 或使用说明过旧
- Release 说明过于简单，无法体现升级内容
- 没有截图或 GIF
- `repo` 字段不是正确的 GitHub 仓库
- 实际仅支持 DB，但未声明 `supportsDBOnly`
- Release 版本号与仓库版本不一致
