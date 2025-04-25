const axios = require('axios');
const { FEISHU_CONFIG } = require('../config/config');
const { log } = require('./utils');

// 获取飞书访问令牌
async function getFeishuToken() {
  try {
    const appId = FEISHU_CONFIG.APP_ID || process.env.FEISHU_APP_ID;
    const appSecret = FEISHU_CONFIG.APP_SECRET || process.env.FEISHU_APP_SECRET;
    
    if (!appId || !appSecret) {
      log('飞书Token获取失败: 未配置appId或appSecret', 'error');
      return null;
    }
    
    const response = await axios({
      method: 'post',
      url: 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        app_id: appId,
        app_secret: appSecret
      }
    });
    
    if (response.data && response.data.tenant_access_token) {
      log('成功获取飞书访问令牌', 'success');
      return response.data.tenant_access_token;
    } else {
      log(`飞书Token获取失败: ${JSON.stringify(response.data)}`, 'error');
      return null;
    }
  } catch (error) {
    log(`飞书Token获取出错: ${error.message}`, 'error');
    return null;
  }
}

// 发送飞书消息
async function sendFeishuMessage(messageData) {
  try {
    // 获取手机号，优先使用传入的，然后是环境变量
    const phoneNumber = messageData.phoneNumber || 
                        FEISHU_CONFIG.USER_PHONE || 
                        process.env.FEISHU_USER_PHONE;
    
    if (!phoneNumber) {
      log('飞书消息发送失败: 未配置手机号', 'error');
      return false;
    }
    
    // 在开发环境或测试模式下模拟发送
    if (process.env.NODE_ENV !== 'production' || process.env.TEST_MODE) {
      log('开发环境: 模拟飞书消息发送', 'info');
      log(`接收者: ${phoneNumber}`, 'info');
      log(`消息标题: ${messageData.title || '推特监控通知'}`, 'info');
      log(`消息内容: ${messageData.content || '有新的推特更新'}`, 'info');
      return true;
    }
    
    // 获取Token
    const token = await getFeishuToken();
    if (!token) {
      return false;
    }
    
    // 先通过手机号获取用户ID
    const userIdRes = await axios({
      method: 'get',
      url: `https://open.feishu.cn/open-apis/user/v1/batch_get_id?mobiles=${phoneNumber}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!userIdRes.data.data.mobile_users || !userIdRes.data.data.mobile_users[phoneNumber]) {
      log(`飞书用户ID获取失败: 未找到手机号 ${phoneNumber} 对应的用户`, 'error');
      return false;
    }
    
    const userId = userIdRes.data.data.mobile_users[phoneNumber][0].user_id;
    
    // 准备消息内容
    const title = messageData.title || '推特监控通知';
    const content = messageData.content || '有新的推特更新';
    
    // 发送消息
    const msgRes = await axios({
      method: 'post',
      url: 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=user_id',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        receive_id: userId,
        msg_type: 'post',
        content: JSON.stringify({
          post: {
            'zh_cn': {
              title: title,
              content: [
                [
                  {
                    tag: 'text',
                    text: content
                  }
                ]
              ]
            }
          }
        })
      }
    });
    
    if (msgRes.data && msgRes.data.code === 0) {
      log('飞书消息发送成功', 'success');
      return true;
    } else {
      log(`飞书消息发送失败: ${JSON.stringify(msgRes.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`飞书消息发送出错: ${error.message}`, 'error');
    if (error.response) {
      log(`HTTP状态码: ${error.response.status}`, 'error');
      log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
    }
    return false;
  }
}

module.exports = {
  sendFeishuMessage
}; 