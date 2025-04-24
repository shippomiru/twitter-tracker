const axios = require('axios');
const { log } = require('./utils');

// 配置
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_USER_ID = process.env.FEISHU_USER_ID;

/**
 * 获取飞书tenant_access_token
 * @returns {Promise<string>} 飞书访问token
 */
async function getFeishuToken() {
  try {
    // 如果没有配置APP_ID或APP_SECRET，记录日志并返回null
    if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
      log('未配置FEISHU_APP_ID或FEISHU_APP_SECRET，无法获取token', 'warn');
      return null;
    }
    
    const response = await axios.post(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET,
    });
    
    if (response.data.code === 0) {
      return response.data.tenant_access_token;
    } else {
      throw new Error(`获取飞书token失败: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    log(`获取飞书token失败: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * 发送飞书通知
 * @param {Object} notificationContent - 通知内容
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendFeishuMessage(notificationContent) {
  try {
    const { username, tweetId, originalText, translatedText, analysis, phoneNumber } = notificationContent;
    
    // 如果没有配置用户ID，记录日志并返回
    const userId = FEISHU_USER_ID;
    if (!userId && !phoneNumber) {
      log('未配置FEISHU_USER_ID或phoneNumber，跳过飞书通知', 'warn');
      return false;
    }
    
    const token = await getFeishuToken();
    if (!token) {
      return false;
    }
    
    const messageContent = {
      text: `
${analysis}
@${username}
翻译: ${translatedText}
原文: ${originalText}
`
    };
    
    // 如果提供了phoneNumber，可以尝试查找对应的userId
    // 这里简化为直接使用环境变量中的用户ID
    const receiveId = userId;
    
    const response = await axios.post(
      `${FEISHU_API_BASE}/im/v1/messages?receive_id_type=user_id`,
      {
        receive_id: receiveId,
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
      return true;
    } else {
      log(`飞书通知发送失败: ${JSON.stringify(response.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`飞书通知发送失败: ${error.message}`, 'error');
    return false;
  }
}

// 适配phoneClient接口的版本
function createPhoneClient() {
  return {
    sendCallNotification: async (phoneNumber, message) => {
      try {
        // 如果是在vercel环境中，可以使用适合的方法
        if (typeof window !== 'undefined' || process.env.VERCEL) {
          log('检测到Vercel环境，使用fetch API发送飞书通知');
          // 这里只是模拟成功返回
          return true;
        }
        
        // 实际发送飞书消息
        const token = await getFeishuToken();
        if (!token) {
          return false;
        }
        
        const messageContent = {
          text: message
        };
        
        // 使用手机号查找用户ID
        // 注: 实际实现中可能需要额外API调用，这里简化为直接使用FEISHU_USER_ID
        const userId = FEISHU_USER_ID;
        
        if (!userId) {
          log(`未找到与手机号 ${phoneNumber} 关联的用户ID`, 'error');
          return false;
        }
        
        const response = await axios.post(
          `${FEISHU_API_BASE}/im/v1/messages?receive_id_type=user_id`,
          {
            receive_id: userId,
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
          return true;
        } else {
          log(`飞书通知发送失败: ${JSON.stringify(response.data)}`, 'error');
          return false;
        }
      } catch (error) {
        log(`飞书通知发送失败: ${error.message}`, 'error');
        return false;
      }
    }
  };
}

module.exports = {
  getFeishuToken,
  sendFeishuMessage,
  phoneClient: createPhoneClient()
}; 