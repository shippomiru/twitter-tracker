const { EMAIL_CONFIG } = require('../config/config');
const { log } = require('./utils');
const axios = require('axios');

// 使用Resend API发送邮件
async function sendEmailNotification(notificationData) {
  try {
    // 检查API密钥是否配置
    const API_KEY = EMAIL_CONFIG.API_KEY || process.env.EMAIL_API_KEY;
    if (!API_KEY) {
      log('邮件发送失败: 未配置Email API Key', 'error');
      return false;
    }
    
    const TO_EMAIL = notificationData.emailAddress || process.env.DEFAULT_EMAIL_TO;
    if (!TO_EMAIL) {
      log('邮件发送失败: 未配置收件人邮箱地址', 'error');
      return false;
    }
    
    // 准备邮件内容
    const subject = notificationData.subject || '推特监控通知';
    const body = notificationData.body || '推特监控服务有新的通知';
    
    // 记录发送日志
    log(`准备发送邮件通知到 ${TO_EMAIL}`, 'info');
    log(`邮件主题: ${subject}`, 'info');
    
    // 在开发环境下模拟发送
    if (process.env.NODE_ENV !== 'production') {
      log('开发环境: 模拟邮件发送', 'info');
      log(`邮件内容: ${body}`, 'info');
      return true;
    }
    
    // 在生产环境中使用Resend API
    const response = await axios({
      method: 'post',
      url: 'https://api.resend.com/emails',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        from: 'Flashtweet <notify@flashtweet.app>',
        to: [TO_EMAIL],
        subject: subject,
        html: body
      }
    });
    
    if (response.status >= 200 && response.status < 300) {
      log('邮件发送成功', 'success');
      return true;
    } else {
      log(`邮件发送失败: HTTP ${response.status}`, 'error');
      return false;
    }
  } catch (error) {
    log(`邮件发送出错: ${error.message}`, 'error');
    if (error.response) {
      log(`HTTP状态码: ${error.response.status}`, 'error');
      log(`错误响应: ${JSON.stringify(error.response.data)}`, 'error');
    }
    return false;
  }
}

// 为api-clients.ts提供EmailClient接口实现
const emailClient = {
  sendNotification: async (to, subject, content) => {
    // 直接调用已有的sendEmailNotification函数
    return await sendEmailNotification({
      emailAddress: to,
      subject: subject,
      body: content
    });
  }
};

module.exports = {
  sendEmailNotification,
  emailClient
}; 