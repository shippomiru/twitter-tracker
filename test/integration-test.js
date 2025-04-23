#!/usr/bin/env node

const axios = require('axios');
const https = require('https');
require('dotenv').config();

// 配置
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.siliconflow.cn/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_API_URL = 'api.resend.com';
const RESEND_API_PATH = '/emails';
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_USER_ID = process.env.FEISHU_USER_ID;

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
  }
];

// 构建DeepSeek提示词
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
    throw error;
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
    throw e;
  }
}

// 发送邮件通知（使用Resend）
async function sendEmailNotification(tweet, analysis) {
  try {
    const emailData = {
      from: 'onboarding@resend.dev',
      to: process.env.EMAIL_TO,
      subject: `${tweet.author.username}：${analysis.summary}`,
      html: `
        <p>@${tweet.author.username} (${tweet.author.name})</p>
        <p>翻译: ${analysis.translation}</p>
        <p>原文: ${tweet.text}</p>
        <p>Twitter更新时间: ${new Date().toLocaleString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })}</p>
      `
    };

    const postData = JSON.stringify(emailData);
    const options = {
      hostname: RESEND_API_URL,
      port: 443,
      path: RESEND_API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            log('邮件发送成功');
            resolve();
          } else {
            log(`邮件发送失败: ${responseData}`, 'error');
            reject(new Error('邮件发送失败'));
          }
        });
      });

      req.on('error', (e) => {
        log(`邮件发送请求出错: ${e.message}`, 'error');
        reject(e);
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    log(`邮件发送失败: ${error.message}`, 'error');
    throw error;
  }
}

// 获取飞书tenant_access_token
async function getFeishuToken() {
  try {
    const response = await axios.post(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    });
    
    if (response.data.code === 0) {
      return response.data.tenant_access_token;
    } else {
      throw new Error('获取飞书token失败');
    }
  } catch (error) {
    log(`获取飞书token失败: ${error.message}`, 'error');
    throw error;
  }
}

// 发送飞书通知
async function sendFeishuNotification(tweet, analysis) {
  try {
    const token = await getFeishuToken();
    
    const messageContent = {
      text: `
${analysis.summary}
@${tweet.author.username} (${tweet.author.name})
翻译: ${analysis.translation}
原文: ${tweet.text}
`
    };
    
    const response = await axios.post(
      `${FEISHU_API_BASE}/im/v1/messages?receive_id_type=user_id`,
      {
        receive_id: FEISHU_USER_ID,
        msg_type: 'text',
        content: JSON.stringify(messageContent)
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.code === 0) {
      log('飞书通知发送成功');
    } else {
      throw new Error('飞书通知发送失败');
    }
  } catch (error) {
    log(`飞书通知发送失败: ${error.message}`, 'error');
    throw error;
  }
}

// 主测试函数
async function runIntegrationTest() {
  log('开始集成测试...');
  
  // 验证环境变量
  if (!DEEPSEEK_API_KEY) {
    throw new Error('缺少DEEPSEEK_API_KEY环境变量');
  }
  if (!RESEND_API_KEY) {
    throw new Error('缺少RESEND_API_KEY环境变量');
  }
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET || !FEISHU_USER_ID) {
    throw new Error('缺少飞书配置环境变量');
  }
  
  for (const tweet of mockTweets) {
    try {
      log(`处理推文: @${tweet.author.username}`);
      
      // 1. 调用DeepSeek API分析内容
      const prompt = buildPrompt(tweet);
      const response = await callDeepSeekAPI(prompt);
      const analysis = parseResponse(response);
      
      log(`分析结果: ${analysis.relevance === '是' ? 'AI相关' : '非AI相关'}`);
      
      // 2. 如果是AI相关内容，发送通知
      if (analysis.relevance === '是') {
        await sendEmailNotification(tweet, analysis);
        await sendFeishuNotification(tweet, analysis);
      }
      
      // 等待2秒再处理下一条
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      log(`处理推文失败: ${error.message}`, 'error');
    }
  }
  
  log('集成测试完成');
}

// 运行测试
runIntegrationTest().catch(error => {
  log(`测试执行错误: ${error.message}`, 'error');
  process.exit(1);
}); 