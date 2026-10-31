# 发布为正常网页

这个目录已经包含可直接部署的静态网站。构建发布包：

```powershell
powershell -ExecutionPolicy Bypass -File .\build-web.ps1
```

输出：

- `dist/web/`：可直接上传的网站根目录。
- `dist/anomaly-atlas-web.zip`：可直接拖到 Netlify Drop 或上传到其他静态托管平台的压缩包。

## 最快方式：Netlify Drop

1. 打开 <https://app.netlify.com/drop>。
2. 将 `dist/anomaly-atlas-web.zip` 拖入页面。
3. 等待上传完成，获得一个 HTTPS 公网地址。
4. 在 iPad Safari 中打开该地址，并可“添加到主屏幕”。

Netlify Drop 可能要求登录以保留站点。免费站点的域名通常形如 `https://随机名称.netlify.app`。

## GitHub Pages

1. 新建一个公开仓库。
2. 将 `dist/web/` 中的内容上传到仓库根目录。
3. 在仓库 Settings → Pages 中选择从主分支根目录发布。

## Cloudflare Pages

新建 Pages 项目，使用“直接上传”并上传 `dist/anomaly-atlas-web.zip`，或让构建系统直接使用 `dist/web/`。

## 发布后的优势

- 使用固定 HTTPS 地址。
- 在 iPad、手机和电脑上直接访问。
- 支持添加到主屏幕。
- 支持离线缓存。
- 不需要保持 Windows 电脑开机。

## 数据说明

这是纯静态网站，文献默认保存在每个浏览器自己的 `localStorage` 中。它不会把阅读批注同步到云端。若需要跨设备同步，需要进一步接入数据库与登录系统。
