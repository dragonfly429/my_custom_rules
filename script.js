const main = (config) => {
  // 常量定义
  const BASE_URL = "https://raw.githubusercontent.com/dragonfly429/my_custom_rules/refs/heads/main";
  const RULE_PROVIDERS_CONFIG = [
    { name: "zt-proxy", file: "zt_proxy.yaml", target: "🛸 节点选择" },
    { name: "zt-proxy-ai", file: "zt_proxy_ai.yaml", target: "🛸 节点选择" },
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
