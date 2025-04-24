#!/usr/bin/env node

const axios = require('axios');
const https = require('https');
const dns = require('dns');

// 环境变量配置
const X_API_BASE = process.env.X_API_BASE || 'https://api.twitter.com/2';
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'AAAAAAAAAAAAAAAAAAAAAIAy0wEAAAAAvXPWtvFNdjRZAAtlzfjjXtXNgAA%3DrDr2GFLu6VWdnbWoeHkRPgzi5BrUyAwSW6ZtYzo6AfO16ufcKV';

// 日志函数
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

// 检查DNS解析
async function checkDNS(hostname) {
  try {
    log(`开始DNS解析: ${hostname}`);
    const addresses = await dns.promises.resolve4(hostname);
    log(`DNS解析结果: ${JSON.stringify(addresses)}`);
    return addresses;
  } catch (error) {
    log(`DNS解析失败: ${error.message}`, 'error');
    throw error;
  }
}

// 创建HTTPS代理
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 30000,
  // 添加调试信息
  debug: true
});

// 配置axios默认值
axios.defaults.httpsAgent = httpsAgent;
axios.defaults.timeout = 30000;

// 获取用户信息
async function getUserByUsername(username) {
  try {
    // 先检查DNS
    await checkDNS('api.twitter.com');
    
    log(`开始获取用户 ${username} 的信息...`);
    
    const response = await axios.get(
      `${X_API_BASE}/users/by/username/${username}`,
      {
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        },
        // 添加请求调试信息
        validateStatus: function (status) {
          log(`HTTP状态码: ${status}`);
          return true;
        }
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
    }
    if (error.request) {
      log(`请求信息: ${JSON.stringify(error.request)}`, 'error');
    }
    throw error;
  }
}

// 获取用户最新推文
async function getUserTweets(userId, maxResults = 5) {
  try {
    log(`开始获取用户 ${userId} 的最新推文...`);
    
    const response = await axios.get(
      `${X_API_BASE}/users/${userId}/tweets`,
      {
        params: {
          max_results: maxResults,
          'tweet.fields': 'created_at,public_metrics,lang',
          'user.fields': 'name,username,profile_image_url'
        },
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
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
    }
    throw error;
  }
}

// 测试主函数
async function main() {
  try {
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