const axios = require('axios');

// 环境变量配置
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.siliconflow.cn/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-jvzdkbljciknpllbrhlvaskpevyuhbjfmwrdxwsdtfekkcik';

/**
 * DeepSeek API客户端
 * 用于分析Twitter内容、判断相关性和翻译
 */
class DeepSeekClient {
  constructor(apiKey = DEEPSEEK_API_KEY, apiUrl = DEEPSEEK_API_URL) {
    if (!apiKey) {
      throw new Error('缺少DEEPSEEK_API_KEY环境变量');
    }
    
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }
  
  /**
   * 构建判断Twitter内容是否与AI相关的提示词
   * @param {Object} tweet - 推文对象
   * @returns {string} 构建的提示词
   */
  buildRelevancePrompt(tweet) {
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
  
  /**
   * 调用DeepSeek API
   * @param {string} prompt - 提示词
   * @returns {Promise<string>} API响应
   */
  async callAPI(prompt) {
    try {
      console.log('[DeepSeekClient] 发送API请求...');
      
      const response = await axios.post(
        this.apiUrl,
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
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      console.log('[DeepSeekClient] API请求成功');
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('[DeepSeekClient] API请求失败:', error.message);
      if (error.response) {
        console.error('[DeepSeekClient] 错误响应:', JSON.stringify(error.response.data));
      }
      throw error;
    }
  }
  
  /**
   * 解析API响应
   * @param {string} response - API响应文本
   * @returns {Object} 解析后的结果
   */
  parseResponse(response) {
    try {
      const relevanceMatch = response.match(/相关性: (是|否)/);
      const relevance = relevanceMatch ? relevanceMatch[1] : '未知';
      
      let summary = null;
      let translation = null;
      
      if (relevance === '是') {
        // 捕获概述（可能跨多行）
        const summaryMatch = response.match(/概述: ([\s\S]+?)(?=翻译:|$)/);
        summary = summaryMatch ? summaryMatch[1].trim() : null;
        
        // 捕获翻译（可能跨多行）
        const translationMatch = response.match(/翻译: ([\s\S]+?)(?=$)/);
        translation = translationMatch ? translationMatch[1].trim() : null;
      }
      
      return {
        isRelevant: relevance === '是',
        summary,
        translation,
        originalResponse: response
      };
    } catch (error) {
      console.error('[DeepSeekClient] 解析响应失败:', error.message);
      return {
        isRelevant: false,
        summary: null,
        translation: null,
        error: error.message,
        originalResponse: response
      };
    }
  }
  
  /**
   * 分析Twitter内容
   * @param {Object} tweet - 推文对象
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeTweet(tweet) {
    try {
      const prompt = this.buildRelevancePrompt(tweet);
      const response = await this.callAPI(prompt);
      return this.parseResponse(response);
    } catch (error) {
      console.error('[DeepSeekClient] 推文分析失败:', error.message);
      throw error;
    }
  }
}

module.exports = DeepSeekClient; 