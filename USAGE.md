# 搬瓦工库存监控系统使用说明

## 🎉 部署成功！

您的搬瓦工库存监控系统已经成功部署到 Cloudflare Workers！

**网站地址：** https://bandwagonhost-monitor.2dbfun.workers.dev

## 📋 系统功能

### 1. 实时库存监控
- 自动监控搬瓦工各套餐的库存状态
- 每10分钟自动检查一次库存
- 支持11种不同的VPS套餐

### 2. 可视化界面
- 清晰的表格展示所有产品信息
- 实时显示库存状态（有库存/缺货）
- 直接跳转到购买页面

### 3. 邮件订阅通知
- 用户可以订阅特定产品的库存通知
- 当产品从缺货变为有库存时，自动发送邮件通知
- 支持多产品订阅

## 🚀 如何使用

### 访问网站
1. 打开浏览器，访问：https://bandwagonhost-monitor.2dbfun.workers.dev
2. 查看实时库存状态表格

### 订阅库存通知
1. 在网站上找到"订阅库存通知"表单
2. 输入您的邮箱地址
3. 选择要监控的产品
4. 点击"订阅通知"按钮
5. 系统会在该产品有库存时自动发送邮件通知

### 监控的产品列表
- 搬瓦工1GB-VZ-PROMO套餐 ($49.00/年)
- 搬瓦工2GB-VZ-PROMO套餐 ($35.00/年)
- 搬瓦工3GB-SAKURA套餐 ($78.00/年)
- 搬瓦工POWERBOX套餐 ($15.00/年)
- 搬瓦工CN2 GIA-E 1GB ($169.99/年)
- 搬瓦工CN2 GIA-E 2GB ($289.99/年)
- 搬瓦工CN2 GIA-E 4GB ($549.99/年)
- 搬瓦工CN2 GIA-E 8GB ($879.99/年)
- 搬瓦工CN2 GIA-E 32GB ($2759.99/年)
- 搬瓦工香港VPS套餐 ($109.99/年)
- 搬瓦工日本VPS套餐 ($299.99/年)

## ⚙️ 系统配置

### 当前配置
- **检查频率：** 每10分钟
- **管理员邮箱：** 2dbfun@gmail.com
- **KV存储：** 已配置并可用
- **定时任务：** 已启用

### 邮件服务配置（可选）
如果您想启用邮件通知功能，需要配置邮件服务：

#### 使用 SendGrid
```bash
wrangler secret put SENDGRID_API_KEY
# 输入您的 SendGrid API 密钥
```

#### 使用 Mailgun
```bash
wrangler secret put MAILGUN_API_KEY
wrangler secret put MAILGUN_DOMAIN
# 分别输入您的 Mailgun API 密钥和域名
```

## 🔧 管理和维护

### 查看日志
```bash
wrangler tail bandwagonhost-monitor
```

### 手动触发库存检查
访问：https://bandwagonhost-monitor.2dbfun.workers.dev/api/check-stock

### 查看产品数据
访问：https://bandwagonhost-monitor.2dbfun.workers.dev/api/products

### 更新产品信息
编辑 `src/products.json` 文件，然后重新部署：
```bash
wrangler deploy --env=""
```

### 修改检查频率
编辑 `wrangler.toml` 文件中的 crons 配置：
```toml
[triggers]
crons = ["*/5 * * * *"]  # 改为每5分钟检查一次
```

## 📊 API 接口

### GET /
返回主页面

### POST /api/subscribe
订阅产品通知
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

## 🛠️ 故障排除

### 常见问题

1. **邮件通知不工作**
   - 检查是否配置了邮件服务 API 密钥
   - 确认邮箱地址格式正确
   - 查看 Worker 日志是否有错误信息

2. **库存状态不更新**
   - 检查定时任务是否正常运行
   - 手动触发库存检查测试
   - 确认搬瓦工网站可以正常访问

3. **订阅失败**
   - 检查 KV 存储是否正常工作
   - 确认邮箱格式正确
   - 查看浏览器控制台错误信息

### 获取帮助
如果遇到问题，可以：
1. 查看 Worker 日志：`wrangler tail bandwagonhost-monitor`
2. 检查 Cloudflare Dashboard 中的 Worker 状态
3. 联系管理员：2dbfun@gmail.com

## 📈 性能优化建议

1. **缓存策略**
   - 产品数据缓存5分钟
   - 避免频繁请求搬瓦工网站

2. **监控频率**
   - 默认10分钟检查一次，平衡及时性和资源消耗
   - 可根据需要调整为5分钟或15分钟

3. **邮件发送**
   - 只在库存状态变化时发送通知
   - 避免重复发送相同通知

## 🔒 安全注意事项

1. **API 密钥管理**
   - 使用 Wrangler secrets 存储敏感信息
   - 定期更换 API 密钥

2. **访问控制**
   - 当前系统对所有用户开放
   - 如需限制访问，可添加身份验证

3. **数据保护**
   - 用户邮箱信息存储在 KV 中
   - 遵守相关隐私法规

---

**系统版本：** 1.0.0  
**最后更新：** 2025年7月20日  
**技术支持：** 2dbfun@gmail.com