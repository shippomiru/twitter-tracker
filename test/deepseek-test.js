#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

// DeepSeek API配置
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.siliconflow.cn/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 日志函数
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

// 模拟Twitter内容数据
const mockTweets = [
  {
    id: '1',
    text: 'Just published a new paper on large language models and their ability to reason about code. The results show a 15% improvement over previous SoTA models. Check out the full paper at https://arxiv.org/abs/2304.12345',
    author: {
      username: 'ai_researcher',
      name: 'AI Research Lab'
    }
  },
  {
    id: '2',
    text: 'Had an amazing dinner with my family tonight. The kids loved the new pasta recipe I tried. Sometimes the simple moments are the best ones. #familytime #dinner',
    author: {
      username: 'everyday_life',
      name: 'Jane Smith'
    }
  },
  {
    id: '3',
    text: 'Breaking: New regulations on AI development have been proposed by the EU commission today. These would require extensive ethical reviews before deploying large models to production. Industry leaders are pushing back.',
    author: {
      username: 'tech_news',
      name: 'Tech Daily'
    }
  },
  {
    id: '4',
    text: 'Our team just released an open-source toolkit for fine-tuning diffusion models with 3x less compute than existing methods. This makes image generation more accessible for researchers with limited resources. GitHub link in bio!',
    author: {
      username: 'ml_engineer',
      name: 'Machine Learning Updates'
    }
  },
  {
    id: '5',
    text: 'The political tensions are rising as the upcoming election approaches. Polls show a tight race between the two candidates, with economic policies being the main differentiator.',
    author: {
      username: 'politics_watcher',
      name: 'Political Analysis'
    }
  }
];

// 构建提示词
function buildPrompt(tweet) {
  return `
你是一个专业的AI内容分析助手。你的任务是分析以下Twitter内容，并完成两项任务：

1) 判断内容是否与AI/人工智能相关。回答"是"或"否"。
   - "是"：如果内容直接讨论AI技术、机器学习、大模型、神经网络等AI相关主题
   - "否"：如果内容主要关于政治、家庭生活、日常活动等与AI无关的主题

2) 如果内容与AI相关，请提供：
   A. 一个简洁的中文概述（30字以内，将用作邮件标题）
   B. 完整的中文翻译（将与英文原文一起用作邮件正文）

如果内容与AI无关，则只需回答第1点即可。

Twitter内容:
作者: @${tweet.author.username} (${tweet.author.name})
内容: "${tweet.text}"

请按以下格式回复:
相关性: [是/否]
概述: [如果相关，提供中文概述]
翻译: [如果相关，提供中文翻译]
`;
}

// 调用DeepSeek API
async function callDeepSeekAPI(prompt) {
  try {
    log('开始调用DeepSeek API...');
    
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        }
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    log(`API调用失败: ${error.message}`, 'error');
    if (error.response) {
      log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
    }
    return null;
  }
}

// 解析API响应
function parseResponse(response) {
  try {
    const relevanceMatch = response.match(/相关性: (是|否)/);
    const relevance = relevanceMatch ? relevanceMatch[1] : '未知';
    
    let summary = null;
    let translation = null;
    
    if (relevance === '是') {
      const summaryMatch = response.match(/概述: (.+?)(?:\n|$)/);
      summary = summaryMatch ? summaryMatch[1].trim() : null;
      
      const translationMatch = response.match(/翻译: (.+?)(?:\n|$)/);
      translation = translationMatch ? translationMatch[1].trim() : null;
    }
    
    return {
      relevance,
      summary,
      translation
    };
  } catch (e) {
    log(`解析响应失败: ${e.message}`, 'error');
    return {
      relevance: '未知',
      summary: null,
      translation: null
    };
  }
}

// 测试主函数
async function runTest() {
  log('开始DeepSeek-V3模型测试...', 'info');
  
  if (!DEEPSEEK_API_KEY) {
    log('错误: 未找到DEEPSEEK_API_KEY环境变量', 'error');
    log('请在.env文件中设置DEEPSEEK_API_KEY', 'error');
    return;
  }
  
  const results = [];
  
  for (let i = 0; i < mockTweets.length; i++) {
    const tweet = mockTweets[i];
    log(`处理第${i+1}条Twitter内容: @${tweet.author.username}...`);
    
    const prompt = buildPrompt(tweet);
    log('构建的提示词:', 'debug');
    log(prompt, 'debug');
    
    const response = await callDeepSeekAPI(prompt);
    if (!response) {
      log(`第${i+1}条内容API调用失败，跳过`, 'error');
      continue;
    }
    
    log('API响应:', 'debug');
    log(response, 'debug');
    
    const parsedResponse = parseResponse(response);
    
    results.push({
      tweet,
      analysis: parsedResponse
    });
    
    // 生成结果汇总
    log(`分析结果 #${i+1}:`, 'success');
    log(`- 作者: @${tweet.author.username} (${tweet.author.name})`, 'info');
    log(`- AI相关性: ${parsedResponse.relevance}`, 'info');
    
    if (parsedResponse.relevance === '是') {
      log(`- 中文概述: ${parsedResponse.summary}`, 'info');
      log(`- 中文翻译: ${parsedResponse.translation}`, 'info');
    }
    
    log('--------------------------------------', 'info');
    
    // 避免频繁调用API
    if (i < mockTweets.length - 1) {
      log('等待2秒后处理下一条...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // 输出最终统计
  log('\n最终结果统计:', 'success');
  log(`总计分析 ${results.length} 条Twitter内容`, 'info');
  log(`AI相关内容: ${results.filter(r => r.analysis.relevance === '是').length} 条`, 'info');
  log(`非AI相关内容: ${results.filter(r => r.analysis.relevance === '否').length} 条`, 'info');
  
  return results;
}

// 执行测试
runTest().then(() => {
  log('测试完成', 'success');
}).catch(err => {
  log(`测试执行错误: ${err.message}`, 'error');
}); 