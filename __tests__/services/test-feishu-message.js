#!/usr/bin/env node

const axios = require('axios');
require('dotenv').config();

// 飞书API配置
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const USER_PHONE = process.env.FEISHU_USER_PHONE;

// 日志函数
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

// 获取tenant_access_token
async function getTenantAccessToken() {
  try {
    log('开始获取tenant_access_token...');
    log(`使用的App ID: ${APP_ID}`);
    log(`使用的App Secret: ${APP_SECRET}`);
    const response = await axios.post(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
      app_id: APP_ID,
      app_secret: APP_SECRET,
    });
    
    if (response.data.code === 0) {
      const token = response.data.tenant_access_token;
      log(`成功获取tenant_access_token: ${token.substring(0, 10)}...`);
      return token;
    } else {
      log(`获取tenant_access_token失败: ${JSON.stringify(response.data)}`, 'error');
      throw new Error('获取tenant_access_token失败');
    }
  } catch (error) {
    log(`获取tenant_access_token时发生错误: ${error.message}`, 'error');
    if (error.response) {
      log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
    }
    throw error;
  }
}

// 发送消息
async function sendMessage(userId, token) {
  try {
    log(`开始向用户发送消息，user_id: ${userId}...`);
    
    const messageContent = {
      text: `这是一条测试消息\n原文: Hello, this is a test message\n翻译: 你好，这是一条测试消息`,
    };
    
    const requestBody = {
      receive_id: userId,
      msg_type: 'text',
      content: JSON.stringify(messageContent),
    };
    
    log(`请求体: ${JSON.stringify(requestBody, null, 2)}`);
    
    const response = await axios.post(
      `${FEISHU_API_BASE}/im/v1/messages?receive_id_type=user_id`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.data.code === 0) {
      const messageId = response.data.data.message_id;
      log(`消息发送成功，message_id: ${messageId}`);
      return messageId;
    } else {
      log(`消息发送失败: ${JSON.stringify(response.data)}`, 'error');
      throw new Error('消息发送失败');
    }
  } catch (error) {
    log(`发送消息时发生错误: ${error.message}`, 'error');
    if (error.response) {
      log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
    }
    throw error;
  }
}

// 测试函数
async function main() {
  try {
    // 1. 获取token
    const token = await getTenantAccessToken();
    
    // 2. 发送消息
    const userId = 'dcb5ccf3'; // 测试用户ID
    const messageId = await sendMessage(userId, token);
    
    log('测试完成', 'success');
    log(`成功发送消息，message_id: ${messageId}`, 'success');
  } catch (error) {
    log(`测试失败: ${error.message}`, 'error');
  }
}

// 执行测试
main(); 