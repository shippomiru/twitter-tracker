#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();
const twitterService = require('../../lib/services/twitterService');
const { log } = require('../../lib/services/utils');

// Twitter API 配置
const TWITTER_API_BASE = 'https://api.twitter.com/2';
const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAAIAy0wEAAAAAvXPWtvFNdjRZAAtlzfjjXtXNgAA%3DrDr2GFLu6VWdnbWoeHkRPgzi5BrUyAwSW6ZtYzo6AfO16ufcKV';

// 日志函数
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

// 验证 Bearer Token
function validateBearerToken(token) {
  if (!token) {
    throw new Error('Bearer Token 不能为空');
  }
  if (!token.startsWith('Bearer ')) {
    throw new Error('Bearer Token 格式不正确，应该以 "Bearer " 开头');
  }
  log('Bearer Token 格式验证通过', 'success');
}

// 获取用户ID
async function getUserByUsername(username) {
  try {
    log(`开始获取用户 ${username} 的信息...`);
    
    const response = await axios.get(
      `${TWITTER_API_BASE}/users/by/username/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 设置30秒超时
      }
    );
    
    if (response.data && response.data.data) {
      log(`成功获取用户信息:`, 'success');
      log(`用户ID: ${response.data.data.id}`);
      log(`用户名: ${response.data.data.username}`);
      log(`显示名称: ${response.data.data.name}`);
      return response.data.data.id;
    } else {
      throw new Error('未找到用户信息');
    }
  } catch (error) {
    log(`获取用户信息失败: ${error.message}`, 'error');
    if (error.response) {
      log(`HTTP状态码: ${error.response.status}`, 'error');
      log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
      
      // 处理特定错误
      if (error.response.status === 401) {
        log('认证失败，请检查 Bearer Token 是否正确', 'error');
      } else if (error.response.status === 404) {
        log('用户不存在或已被删除', 'error');
      } else if (error.response.status === 429) {
        log('API请求次数超限，请稍后再试', 'error');
      }
    } else if (error.request) {
      log('请求未收到响应，可能是网络问题', 'error');
    }
    throw error;
  }
}

// 获取用户最新推文
async function getUserTweets(userId, maxResults = 5) {
  try {
    log(`开始获取用户 ${userId} 的最新推文...`);
    
    const response = await axios.get(
      `${TWITTER_API_BASE}/users/${userId}/tweets`,
      {
        params: {
          max_results: maxResults,
          'tweet.fields': 'created_at,public_metrics,lang',
          'user.fields': 'name,username,profile_image_url'
        },
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 设置30秒超时
      }
    );
    
    if (response.data && response.data.data) {
      log(`成功获取推文:`, 'success');
      response.data.data.forEach((tweet, index) => {
        log(`\n推文 #${index + 1}:`);
        log(`ID: ${tweet.id}`);
        log(`内容: ${tweet.text}`);
        log(`创建时间: ${tweet.created_at}`);
        log(`语言: ${tweet.lang}`);
        log(`互动数据: ${JSON.stringify(tweet.public_metrics)}`);
      });
      return response.data.data;
    } else {
      throw new Error('未找到推文');
    }
  } catch (error) {
    log(`获取推文失败: ${error.message}`, 'error');
    if (error.response) {
      log(`HTTP状态码: ${error.response.status}`, 'error');
      log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
      
      // 处理特定错误
      if (error.response.status === 401) {
        log('认证失败，请检查 Bearer Token 是否正确', 'error');
      } else if (error.response.status === 404) {
        log('用户不存在或已被删除', 'error');
      } else if (error.response.status === 429) {
        log('API请求次数超限，请稍后再试', 'error');
      }
    } else if (error.request) {
      log('请求未收到响应，可能是网络问题', 'error');
    }
    throw error;
  }
}

// 测试主函数
async function main() {
  try {
    // 验证 Bearer Token
    validateBearerToken(`Bearer ${BEARER_TOKEN}`);
    
    const username = 'night_breeze_zz';
    
    // 1. 获取用户ID
    const userId = await getUserByUsername(username);
    
    // 2. 获取最新推文
    await getUserTweets(userId);
    
    log('测试完成', 'success');
  } catch (error) {
    log(`测试失败: ${error.message}`, 'error');
  }
}

// 执行测试
main(); 