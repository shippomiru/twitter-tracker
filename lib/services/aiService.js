const DeepSeekClient = require('../deepseek-client');
const { log } = require('./utils');

// 初始化DeepSeek客户端
let deepseekClient;
try {
  deepseekClient = new DeepSeekClient();
  log('DeepSeek客户端初始化成功', 'success');
} catch (error) {
  log(`DeepSeek客户端初始化失败: ${error.message}`, 'error');
}

/**
 * 使用AI处理推文内容
 * @param {Object} tweet - 推文对象
 * @param {string} username - 推文作者用户名
 * @returns {Promise<Object>} 处理结果
 */
async function processTweetWithAI(tweet, username) {
  try {
    // 确保tweet对象具有所需结构
    const enrichedTweet = {
      ...tweet,
      // 如果tweet没有author字段，则创建一个
      author: tweet.author || {
        username: username || 'unknown',
        name: username || 'Unknown User'
      }
    };
    
    if (!deepseekClient) {
      log('DeepSeek客户端未初始化，使用模拟分析', 'warn');
      // 返回模拟的处理结果
      return {
        isRelevant: true,
        summary: `来自 @${enrichedTweet.author.username} 的推文`,
        translation: `[模拟翻译] ${enrichedTweet.text}`,
        analysis: `来自 @${enrichedTweet.author.username} 的推文`
      };
    }
    
    log(`使用DeepSeek分析推文: ${enrichedTweet.id}`);
    const result = await deepseekClient.analyzeTweet(enrichedTweet);
    
    log(`分析结果: 相关性=${result.isRelevant ? '是' : '否'}`);
    if (result.isRelevant) {
      log(`摘要: ${result.summary}`);
    }
    
    return {
      isRelevant: result.isRelevant,
      summary: result.summary,
      translation: result.translation,
      analysis: result.summary || `来自 @${enrichedTweet.author.username} 的推文`
    };
  } catch (error) {
    log(`AI处理推文失败: ${error.message}`, 'error');
    // 出错时返回一个基本结果
    return {
      isRelevant: true,
      summary: `来自推特的新推文`,
      translation: `[翻译失败] ${tweet.text}`,
      analysis: `来自推特的新推文`
    };
  }
}

module.exports = { processTweetWithAI }; 