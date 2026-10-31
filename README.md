# 异常检测研究图谱

一个无需构建工具的静态研究网站，包含主题地图、文献时间线、可筛选卡片库和研究空白页。

目标公网网址：<https://liming0320-guo.github.io/anomaly-atlas/>（仓库创建并启用 Pages 后生效）

GitHub 仓库：<https://github.com/liming0320-guo/anomaly-atlas>

网站采用暖米色、焦橙、琥珀金与深褐配色，并针对 iPad Safari、触控操作和主屏幕安装进行了适配。

## 使用

直接双击 `index.html`，用现代浏览器打开即可。页面不依赖服务器，也不加载任何远程字体或脚本。

建议先做一次“导出备份”。后续新增的论文、收藏、批注与选题备忘默认保存在当前浏览器的 `localStorage` 中；更换浏览器或清理站点数据前，请先导出 JSON。

## 在页面中维护文献

- 点击“添加文献”，录入题名、作者、年份、主题、来源与批注。
- 点击论文卡片的标题打开阅读抽屉，可编辑信息、收藏、复制 BibTeX 和保存研究批注。
- “关联研究空白”会把新增文献加入对应空白页的证据数。
- “导出备份”生成完整 JSON；“导入 JSON”支持恢复备份，也支持直接导入一个文献数组。
- 删除内置文献时只会从当前图谱隐藏，不会修改 `assets/data.js`。

## 在 iPad 上使用

### 方式一：局域网访问（推荐）

1. 确保 iPad 和运行本项目的电脑连接同一个网络，或都接入同一个 Tailscale 网络。
2. 双击 `Open-iPad-Server.cmd`，保持打开的命令窗口不要关闭。
3. 首次启动出现 Windows 防火墙提示时，勾选“专用网络”并允许访问。
4. 在 iPad Safari 中输入窗口中显示的地址，例如 `http://192.168.1.20:8080`。
5. 可从 Safari 的分享菜单选择“添加到主屏幕”，像普通应用一样全屏打开。

注意：浏览器数据与访问地址绑定。如果电脑的局域网 IP 改变，原来的收藏和批注不会自动迁移到新地址。切换地址前请在原地址导出 JSON，再从新地址导入。

### 方式二：单文件离线版

仓库内已经生成：

```text
dist/anomaly-atlas-ipad.html
```

可以把这一个文件通过 iCloud Drive、AirDrop 或文件 App 传到 iPad。部分 iPadOS 文件预览会限制本地 HTML 的脚本运行；若无法正常交互，请使用支持本地 HTML 的浏览器 App，或优先选择局域网方式。

修改网站后，在 Windows PowerShell 中运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\build-ipad.ps1
```

会重新生成单文件版本。

### 方式三：长期在线使用

将整个 `anomaly-research-atlas` 目录部署到任意 HTTPS 静态托管服务，即可在 iPad 上通过固定网址访问。项目已包含 `manifest.webmanifest`、主屏幕图标和 `sw.js` 离线缓存；在 HTTPS 下添加到主屏幕后，断网时也能打开。

局域网 HTTP 地址通常不属于浏览器定义的“安全上下文”，因此离线缓存需要 HTTPS 静态托管才能完整启用。

## 更新内置文献库

内置文献集中在 `assets/data.js` 的 `PAPER_SEED` 数组中。建议每次新增后同步提升 `SEED_VERSION`。

一条文献的最小结构：

```json
{
  "id": "example2026",
  "title": "Original Paper Title",
  "titleZh": "中文题名",
  "authors": ["Author A", "Author B"],
  "year": 2026,
  "venue": "Conference / Journal",
  "type": "方法",
  "topic": "temporal",
  "level": "前沿",
  "tags": ["Transformer", "时序"],
  "summary": "面向研究者的中文导读。",
  "lens": "这篇论文带来的研究启发。",
  "url": "https://doi.org/...",
  "doi": "10....",
  "gaps": ["gap-evaluation-validity"]
}
```

可用主题键：

| 键 | 页面名称 |
| --- | --- |
| `foundations` | 统计与邻近度 |
| `deep` | 深度表示 |
| `temporal` | 时序动态 |
| `graph` | 关系与图 |
| `vision` | 工业视觉 |
| `trust` | 评测与可信 |

可用类型：`方法`、`综述`、`基准`、`数据集`。

## 数据保存策略

内置文献与个人内容分开保存：

- `PAPER_SEED` 是可持续更新的内置数据源。
- 浏览器存储只保存个人新增文献、字段覆盖、隐藏的内置条目、收藏、批注和选题备忘。
- 因此编辑 `assets/data.js` 新增内置条目后，用户已有的本地状态不会覆盖它。

浏览器存储键均以 `anomaly-atlas-` 开头，可以在开发者工具的 Application / Storage 面板检查或清理。

## 内容核验

内置文献的题名、作者、年份和 DOI/公开链接在 2026-10-30 通过 Crossref、arXiv 与官方会议页面交叉核验。中文导读为研究辅助摘要，不应替代原文。个别 2025—2026 年条目为预印本，卡片中会注明 `arXiv preprint`。
