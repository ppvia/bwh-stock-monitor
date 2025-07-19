// 简化的管理后台功能

// 新的库存检查逻辑 - 根据你的要求实现
async function checkProductStockNew(monitorUrl) {
  try {
    const response = await fetch(monitorUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      redirect: 'follow' // 自动跟随重定向
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const finalUrl = response.url; // 获取最终重定向后的URL
    
    // 检查是否包含缺货元素
    const outOfStockElement = '<div class="errorbox" style="display:block;">Out of Stock</div>';
    const hasOutOfStockElement = html.includes(outOfStockElement);
    
    // 如果没有缺货元素，则认为有库存
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

// 更新产品库存状态函数 - 支持自定义产品
async function updateProductStockNew(env) {
  try {
    // 获取自定义产品列表
    const customProductsData = await env.MONITOR_KV.get('custom:products');
    let products = customProductsData ? JSON.parse(customProductsData) : getDefaultProducts();
    
    // 并发检查所有产品的库存状态
    const stockPromises = products.map(async (product) => {
      try {
        const monitorUrl = product.monitorUrl || product.buyUrl;
        const result = await checkProductStockNew(monitorUrl);
        return { ...product, inStock: result.inStock };
      } catch (error) {
        console.error(`检查产品 ${product.id} 库存失败:`, error);
        return { ...product, inStock: false }; // 出错时默认为缺货
      }
    });
    
    const updatedProducts = await Promise.all(stockPromises);
    
    // 缓存更新后的产品数据
    await env.MONITOR_KV.put('products:cache', JSON.stringify(updatedProducts), {
      expirationTtl: 300 // 5分钟过期
    });
    
    return updatedProducts;
  } catch (error) {
    console.error('更新库存状态失败:', error);
    throw error;
  }
}

// 管理后台API处理函数
async function handleAdminAPI(request, env, pathname) {
  const url = new URL(request.url);
  
  if (pathname === '/api/admin/products') {
    if (request.method === 'GET') {
      return handleAdminGetProducts(request, env);
    } else if (request.method === 'POST') {
      return handleAdminAddProduct(request, env);
    }
  } else if (pathname.startsWith('/api/admin/products/') && request.method === 'DELETE') {
    const productId = pathname.split('/').pop();
    return handleAdminDeleteProduct(request, env, productId);
  } else if (pathname === '/api/admin/test-url' && request.method === 'POST') {
    return handleAdminTestUrl(request, env);
  }
  
  return new Response('Not Found', { status: 404 });
}

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
      cpu: productData.cpu || '',
      memory: productData.memory || '',
      storage: productData.storage || '',
      bandwidth: productData.bandwidth || '',
      speed: productData.speed || '',
      location: productData.location || '',
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

module.exports = {
  checkProductStockNew,
  updateProductStockNew,
  handleAdminAPI
};