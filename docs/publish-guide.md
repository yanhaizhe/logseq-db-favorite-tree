# 发布指南

本文档用于将当前插件发布到 Logseq Marketplace，并声明为 `DB graph only` 插件。

## 1. 发布前检查

- 确保 `package.json` 版本号已更新
- 确保 `npm run build` 可以通过
- 确保 `README.md` 已说明插件用途、使用方式、限制条件
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

## 3. 创建正式版本

### 3.1 更新版本号

例如：

- `1.0.0`
- `1.0.1`
- `1.1.0`

### 3.2 提交并打标签

```bash
git add .
git commit -m "release: v1.0.0"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

### 3.3 创建 GitHub Release

1. 打开 GitHub 仓库
2. 进入 `Releases`
3. 选择 `Draft a new release`
4. 选择刚刚推送的 tag，例如 `v1.0.0`
5. 填写版本说明并发布
6. 等待 GitHub Actions 完成自动打包

发布后检查：

- Release 页面中存在自定义 zip 附件
- 不是只看到 GitHub 默认的 `Source code (zip)`

## 4. Marketplace 清单

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

## 5. Marketplace 提交流程

1. Fork `logseq/marketplace`
2. 在 `packages/` 下新建插件目录
3. 新增 `manifest.json`
4. 提交到自己的 fork
5. 发起 Pull Request

建议在 PR 中明确说明：

- 插件仅支持 `DB graph`
- GitHub Release 已附带构建 zip
- README 已包含使用方式
- 已提供截图或 GIF

## 6. 当前项目建议

对于本项目，建议保持以下声明一致：

- `package.json` 中保留 `unsupportedGraphType: "file"`
- Marketplace 中设置 `supportsDB: true`
- Marketplace 中设置 `supportsDBOnly: true`

## 7. 常见驳回原因

- 没有自定义发布 zip
- README 说明不完整
- 没有截图或 GIF
- `repo` 字段不是正确的 GitHub 仓库
- 实际仅支持 DB，但未声明 `supportsDBOnly`
- Release 版本号与仓库版本不一致
