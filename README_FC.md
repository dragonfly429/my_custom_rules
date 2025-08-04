# Clash配置处理服务 (FC)

## 概述

这是一个基于 Alibaba Cloud Function Compute (FC) 的 Express.js 服务，用于动态生成和处理 Clash 代理配置文件。该服务可以自动获取原始配置、添加自定义代理组、集成规则提供者，并优化规则优先级。

## 主要功能

### 🔄 配置处理流程

1. **获取原始配置**
   - 从 `ORIGIN_YAML_URL` 获取基础 Clash 配置
   - 解析 YAML 格式并验证有效性
   - 提取代理节点信息

2. **创建自定义代理组**
   - **ALL_PROXY**: 包含所有代理节点的 url-test 组
   - **USH2**: 专门的美国 Hysteria2 节点组（如果存在）
   - 自动延迟测试，选择最优节点

3. **配置规则提供者 (Rule Providers)**
   - 从 GitHub 仓库动态获取规则文件
   - 使用 ETag 机制确保缓存更新
   - 并发请求提高性能
   - 支持超时和错误处理

4. **规则优化**
   - 添加自定义规则到配置前端
   - Reddit 专用路由到美国节点
   - 清理重复规则
   - 修改 MATCH 规则为 DIRECT

### 📋 规则提供者配置

| 名称 | 文件 | 目标代理组 | 说明 |
|------|------|------------|------|
| zt-proxy | zt_proxy.yaml | ALL_PROXY | 代理规则 |
| zt-proxy-ai | zt_proxy_ai.yaml | USH2 | AI相关规则 |
| zt-direct | zt_direct.yaml | DIRECT | 直连规则 |

### 🚀 性能优化

- **并发请求**: 使用 `Promise.all` 同时获取所有规则文件的 ETag
- **缓存控制**: 基于 ETag 的文件版本管理
- **超时处理**: 15秒请求超时，防止长时间等待
- **错误恢复**: 失败时使用备用配置继续服务

## 技术架构

### 依赖模块

```javascript
const express = require('express');        // Web框架
const bodyParser = require('body-parser'); // 请求体解析
const yaml = require('js-yaml');           // YAML处理
const axios = require('axios');            // HTTP客户端
```

### 核心常量

- `ORIGIN_YAML_URL`: 原始配置文件URL
- `BASE_URL`: GitHub规则仓库地址
- `RULE_PROVIDERS_CONFIG`: 规则提供者配置数组
- `port`: 服务端口 (9000)

## API 接口

### GET /*

**功能**: 获取处理后的 Clash 配置

**响应**: 
- Content-Type: `text/yaml; charset=utf-8`
- 完整的 Clash YAML 配置文件

**处理步骤**:
1. 获取原始配置
2. 创建代理组
3. 配置规则提供者
4. 添加自定义规则
5. 返回 YAML 配置

### POST /*

**功能**: 简单的 POST 请求处理

**响应**: "Hello World!"

## 调试功能

### 日志级别

- `[DEBUG]`: 详细的请求过程信息
- `[ERROR]`: 错误信息和详细诊断
- `console.log`: 一般处理信息
- `console.warn`: 警告信息

### 错误处理

- **超时错误**: 15秒超时检测
- **HTTP错误**: 状态码和响应头分析
- **网络错误**: 请求配置详情
- **未知错误**: 完整错误对象输出

## 配置示例

### 生成的代理组

```yaml
proxy-groups:
  - name: ALL_PROXY
    type: url-test
    proxies: [所有代理节点]
    url: http://www.gstatic.com/generate_204
    interval: 300
    
  - name: USH2
    type: url-test
    proxies: [美国Hysteria2节点]
    url: http://www.gstatic.com/generate_204
    interval: 300
```

### 添加的规则

```yaml
rules:
  - DOMAIN-SUFFIX,reddit.com,USH2
  - RULE-SET,zt-proxy,ALL_PROXY
  - RULE-SET,zt-proxy-ai,USH2
  - RULE-SET,zt-direct,DIRECT
  # ... 原有规则
  - MATCH,DIRECT
```

## 部署说明

### 环境要求

- Node.js 环境
- 依赖包: express, body-parser, js-yaml, axios

### 启动命令

```bash
# 安装依赖
npm install

# 启动服务
npm start
# 或
node fc/index.js
```

### 服务地址

- 本地: `http://localhost:9000`
- 云函数: 根据部署平台配置

## 注意事项

1. **URL配置**: 需要设置 `ORIGIN_YAML_URL` 为有效的配置源
2. **网络访问**: 确保能访问 GitHub 和原始配置URL
3. **超时设置**: 可根据网络环境调整超时时间
4. **错误监控**: 建议配置日志收集和监控

## 更新日志

- ✅ 并发优化: Promise.all 提升性能
- ✅ ETag缓存: 基于文件版本的缓存控制
- ✅ 调试增强: 详细的错误信息和性能监控
- ✅ 超时处理: 15秒超时和错误恢复机制