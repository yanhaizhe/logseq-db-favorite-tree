# Logseq DB Favorite Tree

基于 Logseq DB 图谱与页面属性关系构建的“收藏夹树”插件。

## 当前能力

- 以 Logseq 收藏页面作为根节点
- 通过页面属性（默认 `parent`）自动发现子页面
- 懒加载展开子节点
- 当前打开页面高亮
- DB 变化监听 + 可配置秒数轮询 + 手动刷新
- 明暗主题自动跟随
- 循环依赖检测
- 插件设置支持属性名、面板宽度、自动刷新间隔配置
- 面板内可暂停 / 恢复自动刷新

## 开发

```bash
npm install
npm run build
```

然后在 Logseq 开启开发者模式后，通过 `Load unpacked plugin` 加载当前目录。

## 说明

- 当前实现面向 DB graph，已在 `package.json` 中声明不支持 file graph。
- 为了兼容不同版本的 DB 数据结构，属性解析采用“直接属性 + 引用对象 + 数组值”多策略归一化。
- 属性键匹配不仅支持字面 `parent`，也兼容 DB 内部键格式，例如 `:user.property/parent-xxxx`，因此 Node 类型、多值属性的层级关系也能正常识别。
- 若某些旧版 Logseq 的收藏夹 API 返回结构不同，插件会尽量自动归一化为页面标题列表。
