const main = (config) => {
  // 确保 proxy-groups 存在
  if (!config["proxy-groups"]) {
    config["proxy-groups"] = [];
  }

  // 筛选出所有US地区且类型为hysteria2的代理节点
  const usHysteria2Proxies = [];
  if (config.proxies) {
    config.proxies.forEach(proxy => {
      // 检查代理名称是否包含US，且类型为hysteria2
      if (proxy.name && proxy.name.includes("US") && proxy.type === "hysteria2") {
        usHysteria2Proxies.push(proxy.name);
      }
    });
  }

  // 创建USH2代理组
  const ush2Group = {
    name: "USH2",
    type: "url-test",
    proxies: usHysteria2Proxies
  };

  // 检查是否已存在USH2组，如果存在则更新，否则添加
  const existingGroupIndex = config["proxy-groups"].findIndex(group => group.name === "USH2");
  if (existingGroupIndex !== -1) {
    config["proxy-groups"][existingGroupIndex] = ush2Group;
  } else {
    config["proxy-groups"].unshift(ush2Group);
  }

  // 常量定义
  const BASE_URL = "https://raw.githubusercontent.com/dragonfly429/my_custom_rules/refs/heads/main";
  const RULE_PROVIDERS_CONFIG = [
    { name: "zt-proxy", file: "zt_proxy.yaml", target: "🛸 节点选择" },
    { name: "zt-proxy-ai", file: "zt_proxy_ai.yaml", target: "USH2" },
    { name: "zt-direct", file: "zt_direct.yaml", target: "DIRECT" }
  ];
  
  // 保留现有的 rule-providers，并添加新的自定义规则提供者
  if (!config["rule-providers"]) {
    config["rule-providers"] = {};
  }
  
  // 批量添加规则提供者
  RULE_PROVIDERS_CONFIG.forEach(provider => {
    config["rule-providers"][provider.name] = {
      type: "http",
      behavior: "classical",
      url: `${BASE_URL}/${provider.file}`,
      interval: 11440,
      path: `./my_rules/${provider.file}`
    };
  });  
  
  // 保留现有规则，并在前面插入新的自定义规则
  if (!config["rules"]) {
    config["rules"] = [];
  }
  
  // 在现有规则前插入新的规则
  const newRules = RULE_PROVIDERS_CONFIG.map(provider => {
    return `RULE-SET,${provider.name},${provider.target}`;
  });
  
  config["rules"] = [...newRules, ...config["rules"]];  
  return config;  
}
