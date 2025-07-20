// Cloudflare Worker 主入口文件
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 处理不同的路由
        if (url.pathname === '/') {
            return handleHomePage(request, env);
        } else if (url.pathname === '/admin') {
            return handleAdminPage(request, env);
        } else if (url.pathname === '/api/subscribe' && request.method === 'POST') {
            return handleSubscribe(request, env);
        } else if (url.pathname === '/api/products') {
            return handleGetProducts(request, env);
        } else if (url.pathname === '/api/check-stock') {
            return handleCheckStock(request, env);
        } else if (url.pathname === '/api/admin/products') {
            if (request.method === 'GET') {
                return handleAdminGetProducts(request, env);
            } else if (request.method === 'POST') {
                return handleAdminAddProduct(request, env);
            }
        } else if (url.pathname.startsWith('/api/admin/products/') && request.method === 'DELETE') {
            const productId = url.pathname.split('/').pop();
            return handleAdminDeleteProduct(request, env, productId);
        } else if (url.pathname === '/api/admin/test-url' && request.method === 'POST') {
            return handleAdminTestUrl(request, env);
        }

        return new Response('Not Found', { status: 404 });
    },

    async scheduled(event, env, ctx) {
        // 定时任务：检查库存并发送通知
        ctx.waitUntil(checkStockAndNotify(env));
    }
};

// 处理首页请求
async function handleHomePage(request, env) {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>搬瓦工库存监控</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #333; margin-bottom: 10px; }
        .admin-links { margin-top: 15px; }
        .admin-links a { background: #28a745; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; margin-right: 10px; }
        .admin-links a:hover { background: #218838; }
        .admin-links a.secondary { background: #ffc107; color: black; }
        .admin-links a.secondary:hover { background: #e0a800; }
        .subscribe-form { background: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .btn { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #005a87; }
        .products-table { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: bold; }
        .status-in-stock { background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .status-out-of-stock { background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .buy-btn { background: #007cba; color: white; padding: 6px 12px; border: none; border-radius: 4px; text-decoration: none; font-size: 12px; }
        .buy-btn:hover { background: #005a87; }
        .buy-btn:disabled { background: #ccc; cursor: not-allowed; }
        .loading { text-align: center; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>搬瓦工库存监控</h1>
            <p>实时监控搬瓦工VPS库存状态，有货时自动邮件通知</p>
            <div class="admin-links">
                <a href="/admin">管理后台</a>
                <a href="/api/check-stock" class="secondary">手动检查库存</a>
            </div>
        </div>
        
        <div class="subscribe-form">
            <h3>订阅库存通知</h3>
            <form id="subscribeForm">
                <div class="form-group">
                    <label for="email">邮箱地址：</label>
                    <input type="email" id="email" name="email" required placeholder="请输入您的邮箱地址">
                </div>
                <div class="form-group">
                    <label for="product">选择要监控的产品：</label>
                    <select id="product" name="product" required>
                        <option value="">请选择产品</option>
                    </select>
                </div>
                <button type="submit" class="btn">订阅通知</button>
            </form>
        </div>
        
        <div class="products-table">
            <h3 style="padding: 20px; margin: 0; background: #f8f9fa; border-bottom: 1px solid #eee;">产品库存状态</h3>
            <div id="loading" class="loading">正在加载产品信息...</div>
            <table id="productsTable" style="display: none;">
                <thead>
                    <tr>
                        <th>套餐名称</th>
                        <th>CPU</th>
                        <th>内存大小</th>
                        <th>硬盘容量</th>
                        <th>每月流量</th>
                        <th>带宽</th>
                        <th>机房</th>
                        <th>价格/年</th>
                        <th>库存状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="productsBody">
                </tbody>
            </table>
        </div>
    </div>

    <script>
        async function loadProducts() {
            try {
                const response = await fetch('/api/products');
                const products = await response.json();
                
                const tbody = document.getElementById('productsBody');
                const select = document.getElementById('product');
                tbody.innerHTML = '';
                select.innerHTML = '<option value="">请选择产品</option>';
                
                products.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = \`
                        <td>\${product.name}</td>
                        <td>\${product.cpu || '-'}</td>
                        <td>\${product.memory || '-'}</td>
                        <td>\${product.storage || '-'}</td>
                        <td>\${product.bandwidth || '-'}</td>
                        <td>\${product.speed || '-'}</td>
                        <td>\${product.location || '-'}</td>
                        <td>\${product.price || '-'}</td>
                        <td>
                            <span class="\${product.inStock ? 'status-in-stock' : 'status-out-of-stock'}">
                                \${product.inStock ? '有库存' : '缺货'}
                            </span>
                        </td>
                        <td>
                            \${product.inStock ? 
                                \`<a href="\${product.buyUrl}" target="_blank" class="buy-btn">立即购买</a>\` : 
                                \`<button class="buy-btn" disabled>缺货</button>\`
                            }
                        </td>
                    \`;
                    tbody.appendChild(row);
                    
                    const option = document.createElement('option');
                    option.value = product.id;
                    option.textContent = product.name;
                    select.appendChild(option);
                });
                
                document.getElementById('loading').style.display = 'none';
                document.getElementById('productsTable').style.display = 'table';
            } catch (error) {
                console.error('加载产品失败:', error);
                document.getElementById('loading').innerHTML = '加载失败，请刷新页面重试';
            }
        }
        
        document.getElementById('subscribeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                email: formData.get('email'),
                product: formData.get('product')
            };
            
            try {
                const response = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    alert('订阅成功！我们会在产品有库存时通知您。');
                    e.target.reset();
                } else {
                    alert('订阅失败：' + result.error);
                }
            } catch (error) {
                alert('订阅失败，请稍后重试');
            }
        });
        
        loadProducts();
        setInterval(loadProducts, 30000);
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// 处理管理页面请求
async function handleAdminPage(request, env) {
    const adminHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>搬瓦工库存监控 - 管理后台</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #333; margin-bottom: 10px; }
        .nav { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        .nav a { color: #007cba; text-decoration: none; margin: 0 15px; padding: 8px 16px; border-radius: 4px; }
        .nav a:hover { background: #f0f8ff; }
        .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .section h3 { color: #333; margin-bottom: 15px; border-bottom: 2px solid #007cba; padding-bottom: 5px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        .btn { background: #007cba; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
        .btn:hover { background: #005a87; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
        .btn-success { background: #28a745; }
        .btn-success:hover { background: #218838; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: bold; }
        .status-in-stock { background: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .status-out-of-stock { background: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .loading { text-align: center; padding: 20px; color: #666; }
        .message { padding: 10px; border-radius: 4px; margin-bottom: 15px; }
        .message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .url-input { font-family: monospace; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>搬瓦工库存监控 - 管理后台</h1>
            <p>添加、删除和管理监控的产品链接</p>
        </div>
        
        <div class="nav">
            <a href="/">返回主页</a>
        </div>
        
        <div id="message-container"></div>
        
        <div class="section">
            <h3>添加新的监控产品</h3>
            <form id="addProductForm">
                <div class="form-group">
                    <label for="productName">产品名称：</label>
                    <input type="text" id="productName" name="productName" required placeholder="例如：搬瓦工CN2 GIA-E 2GB">
                </div>
                
                <div class="form-group">
                    <label for="productUrl">监控网址：</label>
                    <input type="url" id="productUrl" name="productUrl" class="url-input" required 
                           placeholder="例如：https://bwh81.net/aff.php?aff=&pid=88">
                </div>
                
                <div class="form-group">
                    <label for="productPrice">价格/年：</label>
                    <input type="text" id="productPrice" name="productPrice" placeholder="例如：$289.99">
                </div>
                
                <button type="submit" class="btn btn-success">添加产品</button>
                <button type="button" class="btn" onclick="testUrl()">测试网址</button>
            </form>
        </div>
        
        <div class="section">
            <h3>当前监控的产品</h3>
            <div class="loading" id="products-loading">正在加载产品列表...</div>
            <div id="products-table" style="display: none;">
                <table>
                    <thead>
                        <tr>
                            <th>产品名称</th>
                            <th>监控网址</th>
                            <th>价格</th>
                            <th>库存状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody id="products-tbody">
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="section">
            <h3>测试监控逻辑</h3>
            <div class="form-group">
                <label for="testUrl">测试网址：</label>
                <input type="url" id="testUrl" class="url-input" placeholder="输入要测试的网址">
            </div>
            <button type="button" class="btn" onclick="testSingleUrl()">测试单个网址</button>
            
            <div id="test-results" style="margin-top: 20px;"></div>
        </div>
    </div>

    <script>
        function showMessage(message, type = 'success') {
            const container = document.getElementById('message-container');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            messageDiv.textContent = message;
            container.appendChild(messageDiv);
            
            setTimeout(() => {
                if (container.contains(messageDiv)) {
                    container.removeChild(messageDiv);
                }
            }, 5000);
        }
        
        async function loadProducts() {
            try {
                const response = await fetch('/api/admin/products');
                const products = await response.json();
                
                const tbody = document.getElementById('products-tbody');
                tbody.innerHTML = '';
                
                products.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = \`
                        <td>\${product.name}</td>
                        <td><a href="\${product.monitorUrl || product.buyUrl}" target="_blank" style="font-family: monospace; font-size: 12px;">\${product.monitorUrl || product.buyUrl}</a></td>
                        <td>\${product.price || '-'}</td>
                        <td>
                            <span class="\${product.inStock ? 'status-in-stock' : 'status-out-of-stock'}">
                                \${product.inStock ? '有库存' : '缺货'}
                            </span>
                        </td>
                        <td>
                            \${product.isCustom ? \`<button class="btn btn-danger" onclick="deleteProduct('\${product.id}')">删除</button>\` : '默认产品'}
                        </td>
                    \`;
                    tbody.appendChild(row);
                });
                
                document.getElementById('products-loading').style.display = 'none';
                document.getElementById('products-table').style.display = 'block';
            } catch (error) {
                console.error('加载产品失败:', error);
                showMessage('加载产品列表失败', 'error');
            }
        }
        
        document.getElementById('addProductForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const productData = {
                name: formData.get('productName'),
                monitorUrl: formData.get('productUrl'),
                price: formData.get('productPrice')
            };
            
            try {
                const response = await fetch('/api/admin/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(productData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showMessage('产品添加成功！');
                    e.target.reset();
                    loadProducts();
                } else {
                    showMessage('添加失败：' + result.error, 'error');
                }
            } catch (error) {
                showMessage('添加失败，请稍后重试', 'error');
            }
        });
        
        async function deleteProduct(productId) {
            if (!confirm('确定要删除这个产品吗？')) {
                return;
            }
            
            try {
                const response = await fetch(\`/api/admin/products/\${productId}\`, {
                    method: 'DELETE'
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    showMessage('产品删除成功！');
                    loadProducts();
                } else {
                    showMessage('删除失败：' + result.error, 'error');
                }
            } catch (error) {
                showMessage('删除失败，请稍后重试', 'error');
            }
        }
        
        async function testUrl() {
            const url = document.getElementById('productUrl').value;
            if (!url) {
                showMessage('请输入要测试的网址', 'error');
                return;
            }
            await testSingleUrlInternal(url);
        }
        
        async function testSingleUrl() {
            const url = document.getElementById('testUrl').value;
            if (!url) {
                showMessage('请输入要测试的网址', 'error');
                return;
            }
            await testSingleUrlInternal(url);
        }
        
        async function testSingleUrlInternal(url) {
            const resultsDiv = document.getElementById('test-results');
            resultsDiv.innerHTML = '<div class="loading">正在测试...</div>';
            
            try {
                const response = await fetch('/api/admin/test-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    resultsDiv.innerHTML = \`
                        <div class="message \${result.inStock ? 'success' : 'error'}">
                            <strong>测试结果：</strong>\${result.inStock ? '有库存' : '缺货'}<br>
                            <strong>最终URL：</strong>\${result.finalUrl}<br>
                            <strong>响应时间：</strong>\${result.responseTime}ms<br>
                            <strong>检测逻辑：</strong>\${result.hasOutOfStockElement ? '发现缺货元素' : '未发现缺货元素'}
                        </div>
                    \`;
                } else {
                    resultsDiv.innerHTML = \`<div class="message error">测试失败：\${result.error}</div>\`;
                }
            } catch (error) {
                resultsDiv.innerHTML = \`<div class="message error">测试失败：网络错误</div>\`;
            }
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            loadProducts();
        });
    </script>
</body>
</html>`;

    return new Response(adminHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// 处理订阅请求
async function handleSubscribe(request, env) {
    try {
        const { email, product } = await request.json();

        if (!email || !product) {
            return new Response(JSON.stringify({ error: '邮箱和产品不能为空' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({ error: '邮箱格式不正确' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const subscriptionKey = `subscription:${email}:${product}`;
        const subscriptionData = {
            email,
            product,
            subscribedAt: new Date().toISOString(),
            active: true
        };

        await env.MONITOR_KV.put(subscriptionKey, JSON.stringify(subscriptionData));

        const userSubscriptionsKey = `user:${email}`;
        let userSubscriptions = [];
        const existingData = await env.MONITOR_KV.get(userSubscriptionsKey);
        if (existingData) {
            userSubscriptions = JSON.parse(existingData);
        }

        if (!userSubscriptions.includes(product)) {
            userSubscriptions.push(product);
            await env.MONITOR_KV.put(userSubscriptionsKey, JSON.stringify(userSubscriptions));
        }

        return new Response(JSON.stringify({ success: true, message: '订阅成功' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: '服务器错误' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 获取产品列表和库存状态
async function handleGetProducts(request, env) {
    try {
        const cachedData = await env.MONITOR_KV.get('products:cache');
        let products = [];

        if (cachedData) {
            products = JSON.parse(cachedData);
        } else {
            const customProductsData = await env.MONITOR_KV.get('custom:products');
            products = customProductsData ? JSON.parse(customProductsData) : getDefaultProducts();
            updateProductStockNew(env);
        }

        return new Response(JSON.stringify(products), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: '获取产品信息失败' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 手动检查库存
async function handleCheckStock(request, env) {
    try {
        await updateProductStockNew(env);
        return new Response(JSON.stringify({ success: true, message: '库存检查完成' }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: '检查库存失败' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 获取默认产品列表
function getDefaultProducts() {
    return [
        {
            id: 'bwh1g-vz-promo',
            name: '搬瓦工1GB-VZ-PROMO套餐',
            cpu: '2核',
            memory: '2048 MB',
            storage: '40 GB',
            bandwidth: '2000 GB',
            speed: '2.5 Gbps',
            location: '搬瓦工DC6-PROMO',
            price: '$49.00',
            buyUrl: 'https://bandwagonhost.com/cart.php?a=add&pid=87',
            inStock: false
        },
        {
            id: 'bwh2g-vz-promo',
            name: '搬瓦工2GB-VZ-PROMO套餐',
            cpu: '1核',
            memory: '1024 MB',
            storage: '20 GB',
            bandwidth: '1000 GB',
            speed: '2.5 Gbps',
            location: '搬瓦工DC6-PROMO',
            price: '$35.00',
            buyUrl: 'https://bandwagonhost.com/cart.php?a=add&pid=44',
            inStock: false
        },
        {
            id: 'bwh3g-sakura',
            name: '搬瓦工3GB-SAKURA套餐',
            cpu: '1核',
            memory: '1024 MB',
            storage: '30 GB',
            bandwidth: '800 GB',
            speed: '1 Gbps',
            location: '搬瓦工SAKURA',
            price: '$78.00',
            buyUrl: 'https://bandwagonhost.com/cart.php?a=add&pid=57',
            inStock: true
        }
    ];
}

// 新的库存检查逻辑
async function checkProductStockNew(monitorUrl) {
    try {
        const response = await fetch(monitorUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const finalUrl = response.url;

        const outOfStockElement = '<div class="errorbox" style="display:block;">Out of Stock</div>';
        const hasOutOfStockElement = html.includes(outOfStockElement);

        const inStock = !hasOutOfStockElement;

        return {
            inStock,
            finalUrl,
            hasOutOfStockElement
        };
    } catch (error) {
        console.error('检查库存时出错:', error);
        throw error;
    }
}

// 更新产品库存状态
async function updateProductStockNew(env) {
    try {
        const customProductsData = await env.MONITOR_KV.get('custom:products');
        let products = customProductsData ? JSON.parse(customProductsData) : getDefaultProducts();

        const stockPromises = products.map(async (product) => {
            try {
                const monitorUrl = product.monitorUrl || product.buyUrl;
                const result = await checkProductStockNew(monitorUrl);
                return { ...product, inStock: result.inStock };
            } catch (error) {
                console.error(`检查产品 ${product.id} 库存失败:`, error);
                return { ...product, inStock: false };
            }
        });

        const updatedProducts = await Promise.all(stockPromises);

        await env.MONITOR_KV.put('products:cache', JSON.stringify(updatedProducts), {
            expirationTtl: 300
        });

        return updatedProducts;
    } catch (error) {
        console.error('更新库存状态失败:', error);
        throw error;
    }
}

// 定时任务：检查库存并发送通知
async function checkStockAndNotify(env) {
    try {
        console.log('开始检查库存...');

        const previousDataStr = await env.MONITOR_KV.get('products:cache');
        const previousProducts = previousDataStr ? JSON.parse(previousDataStr) : [];
        const previousStockMap = new Map(previousProducts.map(p => [p.id, p.inStock]));

        const currentProducts = await updateProductStockNew(env);

        for (const product of currentProducts) {
            const previousStock = previousStockMap.get(product.id);

            if (!previousStock && product.inStock) {
                await notifySubscribers(env, product);
            }
        }

        console.log('库存检查完成');
    } catch (error) {
        console.error('定时任务执行失败:', error);
    }
}

// 通知订阅者
async function notifySubscribers(env, product) {
    try {
        const { keys } = await env.MONITOR_KV.list({ prefix: 'subscription:' });

        const notifications = [];

        for (const key of keys) {
            if (key.name.includes(`:${product.id}`)) {
                const subscriptionData = await env.MONITOR_KV.get(key.name);
                if (subscriptionData) {
                    const subscription = JSON.parse(subscriptionData);
                    if (subscription.active) {
                        notifications.push(sendEmailNotification(env, subscription.email, product));
                    }
                }
            }
        }

        await Promise.all(notifications);

        console.log(`已向 ${notifications.length} 位用户发送 ${product.name} 的库存通知`);
    } catch (error) {
        console.error('发送通知失败:', error);
    }
}

// 发送邮件通知
async function sendEmailNotification(env, email, product) {
    try {
        const emailData = {
            to: email,
            subject: `🎉 ${product.name} 现在有库存了！`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007cba;">搬瓦工库存通知</h2>
          <p>您好！</p>
          <p>您订阅的产品 <strong>${product.name}</strong> 现在有库存了！</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>产品详情：</h3>
            <ul>
              <li><strong>套餐名称：</strong>${product.name}</li>
              <li><strong>价格：</strong>${product.price}</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${product.buyUrl}" 
               style="background: #007cba; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              立即购买
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            库存有限，建议尽快购买。
          </p>
        </div>
      `
        };

        console.log(`准备发送邮件给 ${email}:`, emailData.subject);

        if (env.SENDGRID_API_KEY) {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email }] }],
                    from: { email: env.ADMIN_EMAIL || 'noreply@bandwagonhost-monitor.com' },
                    subject: emailData.subject,
                    content: [{ type: 'text/html', value: emailData.html }]
                })
            });

            if (response.ok) {
                console.log(`邮件发送成功给 ${email}`);
                return true;
            } else {
                console.error(`邮件发送失败给 ${email}:`, await response.text());
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error(`发送邮件给 ${email} 失败:`, error);
        return false;
    }
}

// 管理后台API函数

// 获取管理后台的产品列表
async function handleAdminGetProducts(request, env) {
    try {
        const customProductsData = await env.MONITOR_KV.get('custom:products');
        let products = [];

        if (customProductsData) {
            products = JSON.parse(customProductsData);
        } else {
            products = getDefaultProducts().map(p => ({
                ...p,
                monitorUrl: p.buyUrl,
                isDefault: true
            }));
        }

        const cachedData = await env.MONITOR_KV.get('products:cache');
        if (cachedData) {
            const cachedProducts = JSON.parse(cachedData);
            const stockMap = new Map(cachedProducts.map(p => [p.id, p.inStock]));

            products = products.map(p => ({
                ...p,
                inStock: stockMap.get(p.id) || false
            }));
        }

        return new Response(JSON.stringify(products), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: '获取产品列表失败' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 添加新产品
async function handleAdminAddProduct(request, env) {
    try {
        const productData = await request.json();

        if (!productData.name || !productData.monitorUrl) {
            return new Response(JSON.stringify({ error: '产品名称和监控网址不能为空' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const productId = 'custom-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        const existingData = await env.MONITOR_KV.get('custom:products');
        let products = existingData ? JSON.parse(existingData) : [];

        const newProduct = {
            id: productId,
            name: productData.name,
            monitorUrl: productData.monitorUrl,
            buyUrl: productData.monitorUrl,
            price: productData.price || '',
            inStock: false,
            createdAt: new Date().toISOString(),
            isCustom: true
        };

        products.push(newProduct);

        await env.MONITOR_KV.put('custom:products', JSON.stringify(products));
        await env.MONITOR_KV.delete('products:cache');

        return new Response(JSON.stringify({ success: true, product: newProduct }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: '添加产品失败' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 删除产品
async function handleAdminDeleteProduct(request, env, productId) {
    try {
        const existingData = await env.MONITOR_KV.get('custom:products');
        if (!existingData) {
            return new Response(JSON.stringify({ error: '产品不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let products = JSON.parse(existingData);
        const originalLength = products.length;

        products = products.filter(p => p.id !== productId);

        if (products.length === originalLength) {
            return new Response(JSON.stringify({ error: '产品不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await env.MONITOR_KV.put('custom:products', JSON.stringify(products));
        await env.MONITOR_KV.delete('products:cache');

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: '删除产品失败' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// 测试单个网址
async function handleAdminTestUrl(request, env) {
    try {
        const { url } = await request.json();

        if (!url) {
            return new Response(JSON.stringify({ error: '网址不能为空' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const startTime = Date.now();
        const result = await checkProductStockNew(url);
        const responseTime = Date.now() - startTime;

        return new Response(JSON.stringify({
            success: true,
            inStock: result.inStock,
            finalUrl: result.finalUrl,
            responseTime: responseTime,
            hasOutOfStockElement: result.hasOutOfStockElement
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: '测试失败: ' + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}