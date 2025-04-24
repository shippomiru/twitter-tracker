const axios = require('axios');
const { X_API_BASE, BEARER_TOKEN, MONITOR_CONFIG } = require('../config/config');
const { log, storage } = require('./utils');

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
      // 先检查缓存
      const cachedUserId = storage.getUserId(username);
      if (cachedUserId) {
        log(`从缓存获取用户ID: ${username} -> ${cachedUserId}`);
        return { id: cachedUserId, username };
      }

      // 等待请求限制
      await this.waitForRateLimit();

      log(`开始获取用户 ${username} 的信息...`);
      const response = await this.axios.get(`/users/by/username/${username}`);
      
      if (response.data && response.data.data) {
        const user = response.data.data;
        log(`成功获取用户信息:`, 'success');
        log(`用户ID: ${user.id}`);
        log(`用户名: ${user.username}`);
        log(`显示名称: ${user.name}`);
        return user;
      }
      throw new Error('未找到用户信息');
    } catch (error) {
      if (error.response && error.response.status === 429) {
        log(`API请求被限制，等待重试...`, 'warn');
        await new Promise(resolve => setTimeout(resolve, MONITOR_CONFIG.API_RATE_LIMIT.RETRY_AFTER));
        return this.getUserByUsername(username); // 重试
      }
      log(`获取用户信息失败: ${error.message}`, 'error');
      if (error.response) {
        log(`HTTP状态码: ${error.response.status}`, 'error');
        log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
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