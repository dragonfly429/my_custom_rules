const main = (config) => {  
  // 清空所有现有的 rule-providers，只保留您的自定义规则提供者  
  config["rule-providers"] = {  
    "my-high-priority-rules": {  
      type: "http",  
      behavior: "classical",  
      url: "https://raw.githubusercontent.com/dragonfly429/my_custom_rules/refs/heads/main/my_custom_rules.yaml",  
      interval: 11440,  
      path: "./my_rules/my_custom_rules.yaml"  
    }  
  };  
  
  // 查找合适的代理组  
  let targetProxy = "DIRECT";  
  if (config["proxy-groups"] && config["proxy-groups"].length > 0) {  
    // 优先查找名称包含 "proxy" 的组  
    const proxyGroup = config["proxy-groups"].find(group =>   
      group.name.toLowerCase().includes("proxy")  
    );  
    if (proxyGroup) {  
      targetProxy = proxyGroup.name;  
    } else {  
      // 如果没找到，使用第一个代理组  
      targetProxy = config["proxy-groups"][0].name;  
    }  
  }  
  
  // 清空所有现有规则，只保留您的自定义规则  
  config["rules"] = [  
    `RULE-SET,my-high-priority-rules,${targetProxy}`,  
    "MATCH,DIRECT"  // 添加一个兜底规则，未匹配的流量直连  
  ];  
  
  return config;  
}
