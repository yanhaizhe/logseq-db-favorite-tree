# Logseq DB Favorite Tree

基于 Logseq DB 图谱与页面属性关系构建的“收藏夹树”插件。

## 当前能力

- 以 Logseq 收藏页面作为根节点
- 通过页面属性（默认 `parent`）自动发现子页面
- 懒加载展开子节点
- 当前打开页面高亮
- DB 变化监听 + 5 秒轮询 + 手动刷新
- 明暗主题自动跟随
- 循环依赖检测
- 插件设置支持属性名与面板宽度配置

## 开发

```bash
npm install
npm run build
```

然后在 Logseq 开启开发者模式后，通过 `Load unpacked plugin` 加载当前目录。

## 说明

- 当前实现面向 DB graph，已在 `package.json` 中声明不支持 file graph。
- 为了兼容不同版本的 DB 数据结构，属性解析采用“直接属性 + 引用对象 + 数组值”多策略归一化。
- 若某些旧版 Logseq 的收藏夹 API 返回结构不同，插件会尽量自动归一化为页面标题列表。
