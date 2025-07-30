const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 导入主脚本
const { main } = require('../script.js');

// 读取配置文件
const configPath = '/Users/zhuyajin/code/ai/my_custom_rules/test/configTemp.yaml';

try {
  // 读取YAML文件
  const fileContents = fs.readFileSync(configPath, 'utf8');
  const config = yaml.load(fileContents);
  
  console.log('原始配置加载成功');
  console.log('代理数量:', config.proxies ? config.proxies.length : 0);
  console.log('代理组数量:', config['proxy-groups'] ? config['proxy-groups'].length : 0);
  console.log('规则数量:', config.rules ? config.rules.length : 0);
  
  // 执行main方法
  const processedConfig = main(config);
  
  console.log('\n处理后的配置:');
  console.log('代理数量:', processedConfig.proxies ? processedConfig.proxies.length : 0);
  console.log('代理组数量:', processedConfig['proxy-groups'] ? processedConfig['proxy-groups'].length : 0);
  console.log('规则数量:', processedConfig.rules ? processedConfig.rules.length : 0);
  
  // 检查USH2代理组
  const ush2Group = processedConfig['proxy-groups'] ? processedConfig['proxy-groups'].find(group => group.name === 'USH2') : null;
  if (ush2Group) {
    console.log('\nUSH2代理组:');
    console.log('类型:', ush2Group.type);
    console.log('包含的代理数量:', ush2Group.proxies ? ush2Group.proxies.length : 0);
    console.log('代理列表:', ush2Group.proxies);
  } else {
    console.log('\n未找到USH2代理组');
  }
  
  // 检查规则
  console.log('\n前5条规则:');
  if (processedConfig.rules) {
    processedConfig.rules.slice(0, 5).forEach((rule, index) => {
      console.log(`${index + 1}. ${rule}`);
    });
  }
  
  // 保存处理后的配置到文件
  const outputPath = path.join(__dirname, 'processed_config.yaml');
  const yamlStr = yaml.dump(processedConfig, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false
  });
  fs.writeFileSync(outputPath, yamlStr, 'utf8');
  console.log(`\n处理后的配置已保存到: ${outputPath}`);
  
} catch (error) {
  console.error('错误:', error.message);
  process.exit(1);
}