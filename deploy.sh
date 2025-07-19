#!/bin/bash

echo "🚀 搬瓦工库存监控系统部署脚本"
echo "================================"

# 检查是否安装了必要的工具
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI 未安装，请先安装："
    echo "npm install -g wrangler"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

echo "✅ 检查依赖完成"

# 检查是否已登录Cloudflare
echo "🔐 检查Cloudflare登录状态..."
if ! wrangler whoami &> /dev/null; then
    echo "请先登录Cloudflare："
    wrangler login
fi

echo "✅ Cloudflare登录状态正常"

# 安装npm依赖
echo "📦 安装项目依赖..."
npm install

# 创建KV命名空间
echo "🗄️ 创建KV存储命名空间..."

echo "创建生产环境KV命名空间..."
PROD_KV_ID=$(wrangler kv:namespace create "MONITOR_KV" --json | jq -r '.id')

echo "创建预览环境KV命名空间..."
PREVIEW_KV_ID=$(wrangler kv:namespace create "MONITOR_KV" --preview --json | jq -r '.id')

if [ "$PROD_KV_ID" != "null" ] && [ "$PREVIEW_KV_ID" != "null" ]; then
    echo "✅ KV命名空间创建成功"
    echo "生产环境ID: $PROD_KV_ID"
    echo "预览环境ID: $PREVIEW_KV_ID"
    
    # 更新wrangler.toml文件
    echo "📝 更新配置文件..."
    sed -i.bak "s/your-kv-namespace-id/$PROD_KV_ID/g" wrangler.toml
    sed -i.bak "s/your-preview-kv-namespace-id/$PREVIEW_KV_ID/g" wrangler.toml
    rm wrangler.toml.bak
    
    echo "✅ 配置文件更新完成"
else
    echo "❌ KV命名空间创建失败，请手动创建"
    exit 1
fi

# 询问是否配置邮件服务
echo ""
read -p "是否要配置邮件通知服务？(y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "请选择邮件服务提供商："
    echo "1) SendGrid"
    echo "2) Mailgun"
    echo "3) 其他（稍后手动配置）"
    
    read -p "请输入选择 (1-3): " -n 1 -r
    echo
    
    case $REPLY in
        1)
            echo "配置SendGrid..."
            read -p "请输入SendGrid API Key: " SENDGRID_KEY
            echo $SENDGRID_KEY | wrangler secret put SENDGRID_API_KEY
            echo "✅ SendGrid配置完成"
            ;;
        2)
            echo "配置Mailgun..."
            read -p "请输入Mailgun API Key: " MAILGUN_KEY
            read -p "请输入Mailgun Domain: " MAILGUN_DOMAIN
            echo $MAILGUN_KEY | wrangler secret put MAILGUN_API_KEY
            echo $MAILGUN_DOMAIN | wrangler secret put MAILGUN_DOMAIN
            echo "✅ Mailgun配置完成"
            ;;
        3)
            echo "⚠️ 请稍后手动配置邮件服务"
            ;;
    esac
fi

# 询问管理员邮箱
echo ""
read -p "请输入管理员邮箱地址: " ADMIN_EMAIL
if [ ! -z "$ADMIN_EMAIL" ]; then
    sed -i.bak "s/admin@example.com/$ADMIN_EMAIL/g" wrangler.toml
    rm wrangler.toml.bak
    echo "✅ 管理员邮箱设置完成"
fi

# 部署应用
echo ""
echo "🚀 开始部署应用..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 部署成功！"
    echo "================================"
    echo "你的搬瓦工库存监控系统已经部署完成！"
    echo ""
    echo "📋 部署信息："
    echo "- 应用名称: bandwagonhost-monitor"
    echo "- KV存储: 已创建并配置"
    echo "- 定时任务: 每10分钟检查一次库存"
    echo "- 管理员邮箱: $ADMIN_EMAIL"
    echo ""
    echo "🔗 访问你的网站："
    wrangler whoami | grep "Account ID" | awk '{print "https://bandwagonhost-monitor." $3 ".workers.dev"}'
    echo ""
    echo "📚 更多信息请查看 README.md 文件"
else
    echo "❌ 部署失败，请检查错误信息"
    exit 1
fi