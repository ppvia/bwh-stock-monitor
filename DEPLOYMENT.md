# 🚀 部署说明

## GitHub与Cloudflare Workers自动部署配置

### 📋 项目信息
- **GitHub仓库**: https://github.com/ppvia/bwh-stock-monitor
- **Cloudflare Workers**: https://bandwagonhost-monitor.2dbfun.workers.dev
- **Worker名称**: bandwagonhost-monitor

### 🔧 配置步骤

#### 1. 获取Cloudflare API Token

1. 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "Create Token"
3. 使用 "Edit Cloudflare Workers" 模板
4. 配置权限：
   - **Account** - Cloudflare Workers:Edit
   - **Zone** - Zone:Read (如果有自定义域名)
5. 复制生成的API Token

#### 2. 获取Cloudflare Account ID

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 在右侧边栏找到 "Account ID"
3. 复制Account ID

#### 3. 配置GitHub Secrets

访问 https://github.com/ppvia/bwh-stock-monitor/settings/secrets/actions

添加以下Secrets：

```
CLOUDFLARE_API_TOKEN = [你的Cloudflare API Token]
CLOUDFLARE_ACCOUNT_ID = [你的Cloudflare Account ID]
```

#### 4. 自动部署工作流

已配置GitHub Actions工作流 (`.github/workflows/deploy.yml`)：

- ✅ 当推送到 `main` 分支时自动部署
- ✅ 运行测试确保代码质量
- ✅ 自动部署到Cloudflare Workers

### 🔄 部署流程

1. **本地开发** → 推送到GitHub
2. **GitHub Actions** → 自动运行测试
3. **测试通过** → 自动部署到Cloudflare
4. **部署完成** → 网站自动更新

### 📝 手动部署命令

如果需要手动部署：

```bash
# 本地部署
npm run deploy

# 或使用wrangler直接部署
wrangler deploy --env=""
```

### 🛠️ 开发命令

```bash
# 本地开发服务器
npm run dev

# 运行测试
npm test

# 部署到生产环境
npm run deploy
```

### 📊 当前配置

- **KV命名空间ID**: bc6d95eac609447b8d4a07995ff88e38
- **管理员邮箱**: 2dbfun@gmail.com
- **定时任务**: 每10分钟检查库存 (`*/10 * * * *`)

### 🔗 相关链接

- **网站地址**: https://bandwagonhost-monitor.2dbfun.workers.dev
- **管理后台**: https://bandwagonhost-monitor.2dbfun.workers.dev/admin
- **GitHub仓库**: https://github.com/ppvia/bwh-stock-monitor
- **Cloudflare Dashboard**: https://dash.cloudflare.com/

### 🚨 注意事项

1. **API Token安全**: 不要在代码中暴露API Token
2. **KV存储**: 确保KV命名空间ID正确配置
3. **邮件服务**: 需要配置SendGrid或Mailgun API密钥才能发送邮件通知
4. **定时任务**: 每10分钟自动检查库存，可在wrangler.toml中调整频率

### 📧 邮件服务配置

要启用邮件通知功能，需要配置邮件服务API密钥：

```bash
# 配置SendGrid
wrangler secret put SENDGRID_API_KEY

# 或配置Mailgun
wrangler secret put MAILGUN_API_KEY
wrangler secret put MAILGUN_DOMAIN
```

---

**部署状态**: ✅ 已成功部署并配置自动部署
**最后更新**: 2025年7月20日