#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

// API配置
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.siliconflow.cn/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-jvzdkbljciknpllbrhlvaskpevyuhbjfmwrdxwsdtfekkcik';

// 简单提示词，测试API连接
const TEST_PROMPT = '你能用中文回答吗？请简要介绍一下你自己。';

/**
 * 测试DeepSeek API连接
 */
async function testConnection() {
  console.log('开始测试DeepSeek API连接...');
  
  try {
    console.log('正在发送测试请求...');
    console.log(`API URL: ${DEEPSEEK_API_URL}`);
    console.log(`API KEY: ${DEEPSEEK_API_KEY.substring(0, 5)}...${DEEPSEEK_API_KEY.substring(DEEPSEEK_API_KEY.length - 3)}`);
    
    const startTime = Date.now();
    
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [
          {
            role: 'user',
            content: TEST_PROMPT
          }
        ],
        temperature: 0.7,
        max_tokens: 100
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        }
      }
    );
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log('\n测试成功! ✅');
    console.log(`响应时间: ${responseTime}ms`);
    console.log('API响应:');
    console.log('-----------------');
    console.log(response.data.choices[0].message.content);
    console.log('-----------------');
    console.log('响应详情:');
    console.log(`- 模型: ${response.data.model}`);
    console.log(`- 完成原因: ${response.data.choices[0].finish_reason}`);
    console.log(`- 响应tokens: ${response.data.usage.completion_tokens}`);
    console.log(`- 提示tokens: ${response.data.usage.prompt_tokens}`);
    console.log(`- 总tokens: ${response.data.usage.total_tokens}`);
    
    return true;
  } catch (error) {
    console.error('\n测试失败! ❌');
    
    if (error.response) {
      console.error(`HTTP状态码: ${error.response.status}`);
      console.error('错误详情:');
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('未收到响应，可能是网络问题或API端点不正确');
      console.error(error.message);
    } else {
      console.error('请求配置错误:');
      console.error(error.message);
    }
    
    console.error('\n故障排除建议:');
    console.error('1. 确认API密钥是否正确');
    console.error('2. 确认API URL是否正确');
    console.error('3. 检查网络连接');
    console.error('4. 确认当前IP是否被API服务商允许访问');
    
    return false;
  }
}

// 运行测试
testConnection()
  .then(success => {
    if (success) {
      console.log('\nDeepSeek API连接正常，可以集成到应用中了!');
    } else {
      console.error('\n无法连接到DeepSeek API，请检查配置后重试。');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('未知错误:', err);
    process.exit(1);
  }); 