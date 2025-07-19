# 搬瓦工库存监控系统

一个部署在Cloudflare上的搬瓦工VPS库存监控网站，可以实时监控库存状态并在有货时发送邮件通知。

## 功能特性

- 🔍 **实时库存监控** - 自动检查搬瓦工各套餐的库存状态
- 📊 **可视化表格** - 清晰展示所有产品的详细信息和库存状态
- 📧 **邮件订阅通知** - 用户可订阅特定产品，有库存时自动发送邮件通知
- ⚡ **Cloudflare部署** - 基于Cloudflare Workers，全球CDN加速
- 🕒 **定时检查** - 每10分钟自动检查一次库存状态
- 💾 **数据持久化** - 使用Cloudflare KV存储订阅信息

## 部署步骤

### 1. 准备工作

确保你有：
- Cloudflare账户
- Node.js 和 npm 已安装
- Wrangler CLI 工具

安装Wrangler：
```bash
npm install -g wrangler
```

### 2. 登录Cloudflare

```bash
wrangler login
```

### 3. 创建KV命名空间

```bash
# 创建生产环境KV命名空间
wrangler kv:namespace create "MONITOR_KV"

# 创建预览环境KV命名空间
wrangler kv:namespace create "MONITOR_KV" --preview
```

记录返回的命名空间ID，更新 `wrangler.toml` 文件中的相应字段。

### 4. 配置邮件服务（可选）

如果要启用邮件通知功能，需要配置邮件服务API密钥：

```bash
# 设置SendGrid API密钥（示例）
wrangler secret put SENDGRID_API_KEY

# 或者设置其他邮件服务的API密钥
wrangler secret put MAILGUN_API_KEY
```

### 5. 部署应用

```bash
# 安装依赖
npm install

# 部署到Cloudflare
npm run deploy
```

### 6. 设置定时任务

定时任务已在 `wrangler.toml` 中配置，部署后会自动启用每10分钟检查一次库存。

## 配置说明

### wrangler.toml 配置

```toml
name = "bandwagonhost-monitor"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
name = "bandwagonhost-monitor"

[[kv_namespaces]]
binding = "MONITOR_KV"
id = "your-kv-namespace-id"          # 替换为实际的KV命名空间ID
preview_id = "your-preview-kv-namespace-id"  # 替换为预览环境的KV命名空间ID

[vars]
ADMIN_EMAIL = "admin@example.com"    # 替换为你的管理员邮箱

[triggers]
crons = ["0 */10 * * * *"]          # 每10分钟检查一次库存
```

### 环境变量

- `ADMIN_EMAIL`: 管理员邮箱地址
- `SENDGRID_API_KEY`: SendGrid邮件服务API密钥（可选）
- `MAILGUN_API_KEY`: Mailgun邮件服务API密钥（可选）

## API接口

### GET /
返回主页HTML

### POST /api/subscribe
订阅产品库存通知
```json
{
  "email": "user@example.com",
  "product": "bwh1g-vz-promo"
}
```

### GET /api/products
获取所有产品的库存状态

### GET /api/check-stock
手动触发库存检查

## 邮件服务集成

系统支持多种邮件服务，需要在代码中配置相应的API调用：

### SendGrid 示例
```javascript
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email }] }],
    from: { email: env.ADMIN_EMAIL },
    subject: emailData.subject,
    content: [{ type: 'text/html', value: emailData.html }]
  })
});
```

### Mailgun 示例
```javascript
const response = await fetch(`https://api.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    from: env.ADMIN_EMAIL,
    to: email,
    subject: emailData.subject,
    html: emailData.html
  })
});
```

## 监控的产品

系统默认监控以下搬瓦工产品：

- 搬瓦工1GB-VZ-PROMO套餐
- 搬瓦工2GB-VZ-PROMO套餐  
- 搬瓦工3GB-SAKURA套餐
- 搬瓦工POWERBOX套餐
- 搬瓦工CN2 GIA-E系列套餐

可以在 `src/index.js` 的 `getDefaultProducts()` 函数中修改产品列表。

## 开发和调试

```bash
# 本地开发
npm run dev

# 查看日志
wrangler tail

# 测试定时任务
wrangler cron trigger --cron="0 */10 * * * *"
```

## 注意事项

1. **频率限制**: 避免过于频繁地请求搬瓦工网站，建议保持10分钟的检查间隔
2. **邮件配额**: 注意邮件服务的发送配额限制
3. **KV存储**: Cloudflare KV有读写次数限制，注意优化存储策略
4. **错误处理**: 系统已包含基本的错误处理，但建议根据实际情况进行调整

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。