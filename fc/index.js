/**
 * Alibaba Cloud Function Compute (FC) 服务
 * 用于动态生成和处理 Clash 配置文件
 * 
 * 主要功能：
 * 1. 从原始URL获取Clash配置
 * 2. 创建自定义代理组（ALL_PROXY、USH2）
 * 3. 配置规则提供者（rule-providers）
 * 4. 添加自定义规则并调整优先级
 * 5. 返回处理后的YAML配置
 */

// 导入必要的模块
const express = require('express');        // Web框架
const bodyParser = require('body-parser'); // 请求体解析中间件
const yaml = require('js-yaml');           // YAML解析和生成库
const axios = require('axios');            // HTTP客户端

// ==================== 常量定义 ====================

// 原始YAML配置文件的URL地址
const ORIGIN_YAML_URL = "";

// 自定义规则文件的GitHub仓库基础URL
const BASE_URL = "https://raw.githubusercontent.com/dragonfly429/my_custom_rules/refs/heads/main";

// 规则提供者配置数组
// 每个配置包含：名称、文件名、目标代理组
const RULE_PROVIDERS_CONFIG = [
    { name: "zt-proxy", file: "zt_proxy.yaml", target: "ALL_PROXY" },      // 代理规则 -> ALL_PROXY组
    { name: "zt-proxy-ai", file: "zt_proxy_ai.yaml", target: "USH2" },    // AI相关规则 -> USH2组
    { name: "zt-direct", file: "zt_direct.yaml", target: "DIRECT" }       // 直连规则 -> DIRECT
];

// ==================== Express应用初始化 ====================

const app = express();

// 配置中间件
app.use(bodyParser.urlencoded({ extended: true })); // 解析URL编码的请求体
app.use(bodyParser.json());                         // 解析JSON格式的请求体
app.use(bodyParser.raw());                          // 解析原始格式的请求体

// 服务器端口配置
const port = 9000

// ==================== 主要路由处理 ====================

/**
 * GET路由处理器 - 处理所有GET请求
 * 功能：获取原始Clash配置，进行自定义处理后返回新的YAML配置
 */
app.get('/*', async (req, res) => {
    try {
        // ========== 步骤1：获取并解析原始YAML配置 ==========
        console.log('正在从原始URL获取YAML配置...');
        const response = await axios.get(ORIGIN_YAML_URL);
        const config = yaml.load(response.data);
        
        // 验证配置格式的有效性
        if (!config.proxies || !Array.isArray(config.proxies)) {
            console.error('无效的YAML格式：未找到proxies数组');
            return res.status(400).json({ error: 'Invalid YAML format: no proxies found' });
        }
        
        console.log(`成功解析配置，共找到 ${config.proxies.length} 个代理节点`);
        
        // ========== 步骤2：创建ALL_PROXY代理组 ==========
        // 提取所有代理节点的名称，用于创建包含所有节点的代理组
        const allProxyNames = config.proxies.map(proxy => proxy.name);
        console.log(`创建ALL_PROXY代理组，包含 ${allProxyNames.length} 个节点`);
        
        // ========== 步骤3：创建USH2代理组 ==========
        // 筛选出美国地区的Hysteria2协议代理节点
        const ush2Proxies = config.proxies.filter(proxy => 
            proxy.name.includes('US') && proxy.type === 'hysteria2'
        );
        const ush2ProxyNames = ush2Proxies.map(proxy => proxy.name);
        console.log(`创建USH2代理组，包含 ${ush2ProxyNames.length} 个美国Hysteria2节点`);
        
        // ========== 步骤4：配置代理组 ==========
        // 确保proxy-groups字段存在
        if (!config['proxy-groups']) {
            config['proxy-groups'] = [];
            console.log('初始化proxy-groups数组');
        }
        
        // 创建ALL_PROXY代理组配置
        // 使用url-test类型进行自动延迟测试选择最优节点
        const allProxyGroup = {
            name: 'ALL_PROXY',                                    // 代理组名称
            type: 'url-test',                                     // 类型：URL测试
            proxies: allProxyNames,                               // 包含的代理节点
            url: 'http://www.gstatic.com/generate_204',          // 测试URL
            interval: 300                                         // 测试间隔（秒）
        };
        
        // 创建USH2代理组配置（仅包含美国Hysteria2节点）
        const ush2Group = {
            name: 'USH2',                                         // 代理组名称
            type: 'url-test',                                     // 类型：URL测试
            proxies: ush2ProxyNames,                              // 包含的代理节点
            url: 'http://www.gstatic.com/generate_204',          // 测试URL
            interval: 300                                         // 测试间隔（秒）
        };
        
        // 将新创建的代理组添加到配置的最前面
        const newGroups = [allProxyGroup];
        if (ush2ProxyNames.length > 0) {
            newGroups.push(ush2Group);
            console.log('USH2代理组已添加到配置中');
        } else {
            console.log('未找到美国Hysteria2节点，跳过USH2代理组创建');
        }
        
        // 将新代理组放在最前面，保持原有代理组的顺序
        config['proxy-groups'] = [...newGroups, ...config['proxy-groups']];
        console.log(`代理组配置完成，当前共有 ${config['proxy-groups'].length} 个代理组`);
        
        // ========== 步骤5：配置规则提供者（rule-providers）==========
        // 保存原有的规则提供者配置
        const originalRuleProviders = config['rule-providers'] || {};
        const newRuleProviders = {};
        
        console.log('开始配置自定义规则提供者...');
        
        // 创建自定义的规则提供者配置
        // 使用Promise.all并发获取所有文件的ETag，提高性能
        const providerPromises = RULE_PROVIDERS_CONFIG.map(async (provider) => {
            const startTime = Date.now(); // 移到try块外部，确保在catch中也能访问
            try {
                // 获取文件的ETag，确保缓存更新
                console.log(`[DEBUG] 开始获取 ${provider.file} 的ETag... (开始时间: ${new Date().toISOString()})`);
                
                const headResponse = await axios.head(`${BASE_URL}/${provider.file}`, {
                    timeout: 20000, // 20秒超时
                    headers: {
                        'User-Agent': 'FC-Clash-Config-Generator/1.0'
                    }
                });
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                console.log(`[DEBUG] ${provider.file} 请求完成 - 耗时: ${duration}ms, 状态: ${headResponse.status}`);
                
                const etag = headResponse.headers['etag'];
                
                // 处理ETag，用于缓存控制
                let cleanEtag = '';
                if (etag) {
                    // 移除ETag中的引号和特殊字符，只保留字母数字
                    cleanEtag = etag.replace(/["']/g, '').substring(0, 8);
                    console.log(`${provider.file} ETag: ${etag} (简化: ${cleanEtag})`);
                } else {
                    // 如果无法获取ETag，使用当前时间戳
                    cleanEtag = Date.now().toString().substring(-8);
                    console.log(`无法获取 ${provider.file} 的ETag，使用时间戳: ${cleanEtag}`);
                }
                
                const providerConfig = {
                    type: 'http',                                     // 类型：HTTP远程获取
                    behavior: 'classical',                           // 行为：经典模式
                    url: `${BASE_URL}/${provider.file}`,            // 规则文件URL
                    interval: 11440,                                 // 更新间隔（秒）
                    path: `./my_rules/${cleanEtag}_${provider.file}` // 本地缓存路径（带ETag确保更新）
                };
                console.log(`配置规则提供者: ${provider.name} -> ${provider.target} (ETag: ${cleanEtag})`);
                
                return { name: provider.name, config: providerConfig };
                
            } catch (error) {
                // 如果获取文件信息失败，使用默认配置
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                console.error(`[ERROR] 获取 ${provider.file} 信息失败 - 耗时: ${duration}ms`);
                console.error(`[ERROR] 错误类型: ${error.code || 'UNKNOWN'}`);
                console.error(`[ERROR] 错误消息: ${error.message}`);
                
                if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                    console.error(`[ERROR] ${provider.file} 请求超时 (15秒)`);
                    console.error(`[ERROR] 请求URL: ${BASE_URL}/${provider.file}`);
                } else if (error.response) {
                    console.error(`[ERROR] ${provider.file} HTTP错误 - 状态码: ${error.response.status}`);
                    console.error(`[ERROR] ${provider.file} 响应头:`, JSON.stringify(error.response.headers, null, 2));
                } else if (error.request) {
                    console.error(`[ERROR] ${provider.file} 网络错误 - 无响应`);
                    console.error(`[ERROR] 请求配置:`, JSON.stringify(error.config, null, 2));
                } else {
                    console.error(`[ERROR] ${provider.file} 未知错误:`, error);
                }
                
                console.warn(`使用默认配置继续处理 ${provider.file}`);
                const fallbackEtag = Date.now().toString().substring(-8);
                
                const providerConfig = {
                    type: 'http',
                    behavior: 'classical',
                    url: `${BASE_URL}/${provider.file}`,
                    interval: 11440,
                    path: `./my_rules/${fallbackEtag}_${provider.file}`
                };
                console.log(`配置规则提供者: ${provider.name} -> ${provider.target} (备用ETag: ${fallbackEtag})`);
                
                return { name: provider.name, config: providerConfig };
            }
        });
        
        // 等待所有HTTP请求完成
        const providerResults = await Promise.all(providerPromises);
        
        // 将结果添加到newRuleProviders对象中
        providerResults.forEach(result => {
            newRuleProviders[result.name] = result.config;
        });
        
        // 将自定义规则提供者放在最前面，然后是原有的规则提供者
        // 这样确保自定义规则具有更高的优先级
        config['rule-providers'] = { ...newRuleProviders, ...originalRuleProviders };
        console.log(`规则提供者配置完成，当前共有 ${Object.keys(config['rule-providers']).length} 个规则提供者`);
        
        // ========== 步骤6：配置规则（rules）==========
        // 确保rules字段存在
        if (!config.rules) {
            config.rules = [];
            console.log('初始化rules数组');
        }
        
        console.log(`原始配置包含 ${config.rules.length} 条规则`);
        
        // 清理已存在的相关RULE-SET规则，避免重复
        const originalRulesCount = config.rules.length;
        config.rules = config.rules.filter(rule => 
            !rule.startsWith('RULE-SET,zt-proxy') && 
            !rule.startsWith('RULE-SET,zt-direct')
        );
        const removedRulesCount = originalRulesCount - config.rules.length;
        if (removedRulesCount > 0) {
            console.log(`移除了 ${removedRulesCount} 条重复的RULE-SET规则`);
        }
        
        // 创建新的规则数组，这些规则将被添加到最前面
        const newRules = [];
        
        // 添加Reddit专用规则（如果USH2代理组存在）
        // Reddit访问使用美国节点以获得更好的体验
        if (ush2ProxyNames.length > 0) {
            newRules.push('DOMAIN-SUFFIX,reddit.com,USH2');
            console.log('添加Reddit专用规则: DOMAIN-SUFFIX,reddit.com,USH2');
        }
        
        // 根据配置添加RULE-SET规则
        // 按照优先级顺序：代理规则 -> AI规则 -> 直连规则
        RULE_PROVIDERS_CONFIG.forEach(provider => {
            const ruleSet = `RULE-SET,${provider.name},${provider.target}`;
            newRules.push(ruleSet);
            console.log(`添加规则集: ${ruleSet}`);
        });
        
        // 将新规则添加到最前面，确保高优先级
        config.rules = [...newRules, ...config.rules];
        console.log(`规则配置完成，当前共有 ${config.rules.length} 条规则（新增 ${newRules.length} 条）`);
        
        // ========== 步骤7：处理MATCH规则 ==========
        // 查找现有的MATCH规则（通常是最后一条兜底规则）
        // const matchIndex = config.rules.findIndex(rule => rule.startsWith('MATCH,'));
        // if (matchIndex !== -1) {
        //     // 如果找到MATCH规则，将其修改为直连
        //     const oldMatchRule = config.rules[matchIndex];
        //     config.rules[matchIndex] = 'MATCH,DIRECT';
        //     console.log(`修改MATCH规则: ${oldMatchRule} -> MATCH,DIRECT`);
        // } else {
        //     // 如果没有找到MATCH规则，添加一个新的
        //     config.rules.push('MATCH,DIRECT');
        //     console.log('添加新的MATCH规则: MATCH,DIRECT');
        // }
        
        // ========== 步骤8：生成并返回YAML配置 ==========
        console.log('开始生成YAML配置文件...');
        
        // 使用特定的选项来格式化YAML输出
        const yamlStr = yaml.dump(config, {
            lineWidth: -1,          // 不限制行宽，避免长URL被折行
            noRefs: true,           // 不使用引用，确保配置完整性
            quotingType: '"',       // 使用双引号
            forceQuotes: false      // 不强制所有字符串都加引号
        });
        
        // 设置响应头为YAML格式
        res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
        
        console.log('YAML配置生成完成，正在返回给客户端...');
        console.log(`最终配置统计: ${config.proxies.length} 个代理, ${config['proxy-groups'].length} 个代理组, ${config.rules.length} 条规则`);
        
        // 返回处理后的YAML配置
        res.send(yamlStr);
        
    } catch (error) {
        // ========== 错误处理 ==========
        console.error('处理YAML配置时发生错误:', error);
        console.error('错误堆栈:', error.stack);
        
        // 返回错误信息给客户端
        res.status(500).json({ 
            error: 'Failed to process YAML configuration',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
})

// ==================== 其他路由处理 ====================

/**
 * POST路由处理器 - 处理所有POST请求
 * 当前仅返回简单的响应，可根据需要扩展功能
 */
app.post('/*', (req, res) => {
    console.log('收到POST请求');
    res.send('Hello World!')
})

// ==================== 服务器启动 ====================

/**
 * 启动Express服务器
 * 监听指定端口，等待客户端请求
 */
app.listen(port, () => {
    console.log(`===========================================`);
    console.log(`🚀 Clash配置处理服务已启动`);
    console.log(`📡 服务地址: http://localhost:${port}`);
    console.log(`📋 功能说明:`);
    console.log(`   - GET请求: 获取处理后的Clash配置`);
    console.log(`   - 自动创建ALL_PROXY和USH2代理组`);
    console.log(`   - 集成自定义规则提供者`);
    console.log(`   - 优化规则优先级和MATCH处理`);
    console.log(`===========================================`);
})