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

// 根据手机号获取用户user_id
async function getUserId(phone, token) {
  try {
    log(`开始查询用户user_id，手机号: ${phone}...`);
    log(`使用的token: ${token.substring(0, 10)}...`);
    const response = await axios.post(
      `${FEISHU_API_BASE}/contact/v3/users/batch_get_id?user_id_type=user_id`,
      {
        mobiles: [phone],
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    log(`API响应: ${JSON.stringify(response.data)}`);
    
    if (response.data.code === 0 && response.data.data.user_list && response.data.data.user_list.length > 0) {
      const userId = response.data.data.user_list[0].user_id;
      log(`成功获取用户user_id: ${userId}`);
      return userId;
    } else {
      log(`获取用户user_id失败: ${JSON.stringify(response.data)}`, 'error');
      throw new Error('获取用户user_id失败');
    }
  } catch (error) {
    log(`获取用户user_id时发生错误: ${error.message}`, 'error');
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

// 检查消息是否已读
async function checkMessageRead(messageId, token) {
  try {
    log(`开始检查消息是否已读，message_id: ${messageId}...`);
    
    const response = await axios.get(
      `${FEISHU_API_BASE}/im/v1/messages/${messageId}/read_users?user_id_type=user_id`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (response.data.code === 0) {
      const readCount = response.data.data.items.length;
      log(`消息已读状态: ${readCount > 0 ? '已读' : '未读'}`);
      if (readCount > 0) {
        log(`已读用户列表: ${JSON.stringify(response.data.data.items, null, 2)}`);
      }
      return readCount > 0;
    } else {
      log(`检查消息已读状态失败: ${JSON.stringify(response.data)}`, 'error');
      throw new Error('检查消息已读状态失败');
    }
  } catch (error) {
    log(`检查消息已读状态时发生错误: ${error.message}`, 'error');
    if (error.response) {
      log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
    }
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 1. 获取tenant_access_token
    const token = await getTenantAccessToken();
    
    // 2. 直接使用已知的user_id
    const userId = 'dcb5ccf3';
    log(`使用已知的user_id: ${userId}`);
    
    // 3. 发送消息
    const messageId = await sendMessage(userId, token);
    
    // 4. 检查消息是否已读
    await checkMessageRead(messageId, token);
    
    log('所有操作完成！');
  } catch (error) {
    log(`程序执行失败: ${error.message}`, 'error');
    process.exit(1);
  }
}

// 执行主函数
main(); 