# 云函数

- **`luluApi`**：单入口，对应客户端 `js/services/cloud/client.js` 的 `luluApi` 调用。部署后在微信开发者工具中右键该目录 **上传并部署：云端安装依赖**。

## 首启 env

在工具中开通云开发并选择环境；客户端使用 `wx.cloud.init` 默认 `DYNAMIC_CURRENT_ENV` 需在工具里选当前云环境。

## 数据库

按设计文档建集合 `users`、`follows`、`cheer_logs`、`visit_logs`；可选 `share_links`。`users` 文档以用户 `openid` 为 `_id`（由云函数 `doc(openId).set` 创建）。

## 复合索引

若 `listVisitorsToday` / `getCheerInbox` 报索引错误，按控制台提示在「数据库 → 索引」中创建 `visit_logs`（`hostOpenId+dateKey+createdAt`）与 `cheer_logs`（`toOpenId+dateKey+createdAt` 等）复合索引。
