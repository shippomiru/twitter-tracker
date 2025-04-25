const axios = require('axios');
const { X_API_BASE, BEARER_TOKEN, MONITOR_CONFIG } = require('../config/config');
const { log, storage } = require('./utils');
// 引入新的Twitter用户缓存服务
const twitterUserCache = require('./twitterUserCache');

class TwitterService {
  constructor() {
    this.axios = axios.create({
      baseURL: X_API_BASE,
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
    
    // 请求限制控制
    this.requestQueue = [];
    this.lastRequestTime = 0;
  }

  // 控制请求速率
  async waitForRateLimit() {
    const now = Date.now();
    const { WINDOW, MAX_REQUESTS, RETRY_AFTER } = MONITOR_CONFIG.API_RATE_LIMIT;

    // 清理过期的请求记录
    this.requestQueue = this.requestQueue.filter(time => now - time < WINDOW);

    // 如果请求次数达到限制，等待
    if (this.requestQueue.length >= MAX_REQUESTS) {
      const oldestRequest = this.requestQueue[0];
      const waitTime = WINDOW - (now - oldestRequest);
      log(`达到API请求限制，等待 ${Math.ceil(waitTime / 1000)} 秒...`, 'warn');
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestQueue = [];
    }

    // 记录当前请求时间
    this.requestQueue.push(now);
    this.lastRequestTime = now;
  }

  // 通过用户名获取用户信息
  async getUserByUsername(username) {
    try {
      // 检查是否有Bearer Token
      if (!BEARER_TOKEN) {
        const errorMsg = 'Twitter API认证失败: Bearer Token未设置';
        console.error(`[TWITTER_SERVICE_CRITICAL] ${errorMsg}`);
        log(errorMsg, 'error');
        
        // Vercel环境下，如果没有Bearer Token，返回mock数据
        if (process.env.VERCEL) {
          console.warn(`[TWITTER_MOCK] 在Vercel环境中使用mock数据替代Twitter API`);
          return {
            id: `mock_${Math.random().toString(36).substring(2, 10)}`,
            username: username,
            name: username,
          };
        }
        
        throw new Error(errorMsg);
      }

      // 先从持久化缓存中查找
      const cachedUserId = await twitterUserCache.getUserId(username);
      if (cachedUserId) {
        log(`从持久化缓存获取用户ID: ${username} -> ${cachedUserId}`);
        return { id: cachedUserId, username };
      }
      
      // 如果持久化缓存没有，再从内存缓存检查
      const memCachedUserId = storage.getUserId(username);
      if (memCachedUserId) {
        log(`从内存缓存获取用户ID: ${username} -> ${memCachedUserId}`);
        // 将内存缓存同步到持久化缓存
        await twitterUserCache.saveUserId(username, memCachedUserId);
        return { id: memCachedUserId, username };
      }

      // 等待请求限制
      await this.waitForRateLimit();

      log(`开始获取用户 ${username} 的信息...`);
      
      // 添加更多API调用日志
      console.log(`[TWITTER_API_CALL] GET ${X_API_BASE}/users/by/username/${username}`);
      console.log(`[TWITTER_API_HEADERS] Authorization: Bearer ${BEARER_TOKEN ? '已设置' : '未设置'}`);
      
      try {
        const response = await this.axios.get(`/users/by/username/${username}`);
        
        if (response.data && response.data.data) {
          const user = response.data.data;
          log(`成功获取用户信息:`, 'success');
          log(`用户ID: ${user.id}`);
          log(`用户名: ${user.username}`);
          log(`显示名称: ${user.name}`);
          
          // 同时保存到内存缓存和持久化缓存
          storage.addUser(username, user.id);
          await twitterUserCache.saveUserId(username, user.id);
          
          return user;
        }
        throw new Error('未找到用户信息');
      } catch (apiError) {
        console.error(`[TWITTER_API_ERROR] 获取用户信息失败: ${apiError.message}`);
        
        if (apiError.response) {
          console.error(`[TWITTER_API_RESPONSE] 状态码: ${apiError.response.status}`);
          console.error(`[TWITTER_API_RESPONSE] 响应内容: ${JSON.stringify(apiError.response.data || {})}`);
        } else if (apiError.request) {
          console.error(`[TWITTER_API_REQUEST] 请求已发送但没有响应`);
        } else {
          console.error(`[TWITTER_API_ERROR] 请求配置出错: ${apiError.message}`);
        }
        
        // Vercel环境下，如果API调用失败，返回mock数据
        if (process.env.VERCEL) {
          console.warn(`[TWITTER_MOCK] API调用失败，使用mock数据代替`);
          return {
            id: `mock_${Math.random().toString(36).substring(2, 10)}`,
            username: username,
            name: username
          };
        }
        
        throw apiError;
      }
    } catch (error) {
      // 详细记录错误信息
      console.error(`[TWITTER_API_ERROR] 获取用户信息失败: ${error.message}`);
      
      if (error.response && error.response.status === 429) {
        log(`API请求被限制，等待重试...`, 'warn');
        await new Promise(resolve => setTimeout(resolve, MONITOR_CONFIG.API_RATE_LIMIT.RETRY_AFTER));
        return this.getUserByUsername(username); // 重试
      }
      
      log(`获取用户信息失败: ${error.message}`, 'error');
      
      if (error.response) {
        const errorDetails = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
        
        console.error(`[TWITTER_API_ERROR_DETAILS] ${JSON.stringify(errorDetails)}`);
        log(`HTTP状态码: ${error.response.status}`, 'error');
        log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
      } else {
        console.error(`[TWITTER_API_ERROR_NO_RESPONSE] 没有响应对象，可能是网络错误: ${error.message}`);
      }
      
      // 在Vercel环境中，返回mock数据而不是抛出错误
      if (process.env.VERCEL) {
        console.warn(`[TWITTER_MOCK] 错误处理中使用mock数据`);
        return {
          id: `mock_${Math.random().toString(36).substring(2, 15)}`,
          username: username,
          name: username
        };
      }
      
      throw error;
    }
  }

  // 获取用户最新推文
  async getUserTweets(userId, maxResults = 5) {
    try {
      // 等待请求限制
      await this.waitForRateLimit();

      log(`开始获取用户 ${userId} 的最新推文...`);
      const response = await this.axios.get(`/users/${userId}/tweets`, {
        params: {
          max_results: maxResults,
          'tweet.fields': 'created_at,public_metrics,lang',
          'user.fields': 'name,username,profile_image_url'
        }
      });
      
      if (response.data && response.data.data) {
        log(`成功获取推文:`, 'success');
        return response.data.data;
      }
      throw new Error('未找到推文');
    } catch (error) {
      if (error.response && error.response.status === 429) {
        log(`API请求被限制，等待重试...`, 'warn');
        await new Promise(resolve => setTimeout(resolve, MONITOR_CONFIG.API_RATE_LIMIT.RETRY_AFTER));
        return this.getUserTweets(userId, maxResults); // 重试
      }
      log(`获取推文失败: ${error.message}`, 'error');
      if (error.response) {
        log(`HTTP状态码: ${error.response.status}`, 'error');
        log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
      }
      throw error;
    }
  }
}

module.exports = new TwitterService(); 