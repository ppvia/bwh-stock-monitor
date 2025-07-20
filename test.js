// 简单的测试脚本，用于验证系统功能
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🧪 搬瓦工库存监控系统测试');
console.log('========================');

// 测试1: 检查配置文件
console.log('1. 检查配置文件...');
try {
  // 检查必要文件是否存在
  const requiredFiles = [
    'wrangler.toml',
    'package.json', 
    'src/index.js',
    'src/products.json'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      throw new Error(`缺少必要文件: ${file}`);
    }
  }
  
  console.log('✅ 配置文件检查通过');
} catch (error) {
  console.log('❌ 配置文件检查失败:', error.message);
  process.exit(1);
}

// 测试2: 检查产品数据格式
console.log('2. 检查产品数据格式...');
try {
  const productsData = fs.readFileSync('./src/products.json', 'utf8');
  const products = JSON.parse(productsData);
  
  if (!products.products || !Array.isArray(products.products)) {
    throw new Error('产品数据格式错误');
  }
  
  // 检查每个产品的必要字段
  const requiredFields = ['id', 'name', 'cpu', 'memory', 'storage', 'bandwidth', 'speed', 'location', 'price', 'buyUrl'];
  
  for (const product of products.products) {
    for (const field of requiredFields) {
      if (!product[field]) {
        throw new Error(`产品 ${product.id || '未知'} 缺少字段: ${field}`);
      }
    }
  }
  
  console.log(`✅ 产品数据检查通过 (共 ${products.products.length} 个产品)`);
} catch (error) {
  console.log('❌ 产品数据检查失败:', error.message);
  process.exit(1);
}

// 测试3: 语法检查
console.log('3. 进行语法检查...');
try {
  // 检查JavaScript语法
  execSync('node -c src/index.js', { stdio: 'pipe' });
  console.log('✅ JavaScript语法检查通过');
} catch (error) {
  console.log('❌ JavaScript语法检查失败');
  console.log(error.stdout?.toString() || error.message);
  process.exit(1);
}

// 测试4: 检查Wrangler配置
console.log('4. 检查Wrangler配置...');
try {
  const wranglerConfig = fs.readFileSync('wrangler.toml', 'utf8');
  
  // 检查必要的配置项
  const requiredConfigs = [
    'name = "bandwagonhost-monitor"',
    'main = "src/index.js"',
    'binding = "MONITOR_KV"',
    'crons = ["*/10 * * * *"]'
  ];
  
  for (const config of requiredConfigs) {
    if (!wranglerConfig.includes(config)) {
      throw new Error(`缺少配置: ${config}`);
    }
  }
  
  console.log('✅ Wrangler配置检查通过');
} catch (error) {
  console.log('❌ Wrangler配置检查失败:', error.message);
  process.exit(1);
}

console.log('');
console.log('🎉 所有测试通过！');
console.log('');
console.log('📋 下一步操作：');
console.log('1. 运行 ./deploy.sh 进行部署');
console.log('2. 或者手动运行 wrangler deploy');
console.log('3. 配置邮件服务API密钥');
console.log('4. 测试网站功能');
console.log('');
console.log('💡 提示：');
console.log('- 确保已登录Cloudflare: wrangler login');
console.log('- 创建KV命名空间并更新wrangler.toml中的ID');
console.log('- 配置邮件服务以启用通知功能');