const main = (config) => {  
  // 确保 rule-providers 存在  
  if (!config["rule-providers"]) {  
    config["rule-providers"] = {};  
  }  
  
  // 添加您的高优先级规则提供者  
  config["rule-providers"]["my-high-priority-rules"] = {  
    type: "http",  
    behavior: "classical",  
    url: "https://raw.githubusercontent.com/dragonfly429/my_custom_rules/refs/heads/main/my_custom_rules.yaml",  
    interval: 11440,  
    path: "./my_rules/my_custom_rules.yaml"  
  };  
  
  // 确保 rules 数组存在  
  if (!config["rules"]) {  
    config["rules"] = [];  
  }  
  
  // 获取第一个可用的代理组名称  
  let proxyGroupName = "DIRECT"; // 默认使用 DIRECT  
  if (config["proxy-groups"] && config["proxy-groups"].length > 0) {  
    proxyGroupName = config["proxy-groups"][0].name;  
  }  
  
  // 在规则列表最前面添加使用您的 rule-provider 的规则  
  config["rules"].unshift(`RULE-SET,my-high-priority-rules,${proxyGroupName}`);  
  
  return config;  
}
