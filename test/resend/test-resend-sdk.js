#!/usr/bin/env node

// 需要先安装SDK: npm install resend
// 安装命令: npm install resend --save-dev

const { Resend } = require('resend');

// 初始化Resend客户端
const RESEND_API_KEY = 're_fNpDFaCE_68eiHR86VJEsCqa2PwwaWggN'; // 已替换为实际的API密钥
const resend = new Resend(RESEND_API_KEY);

// 记录日志函数
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// 邮件发送函数
async function sendTestEmail() {
  try {
    log('开始测试Resend API (使用SDK)...');
    
    const recipient = '297029445@qq.com'; // 已替换为实际的收件邮箱
    log(`目标邮箱: ${recipient}`);
    
    const data = {
      from: 'onboarding@resend.dev', // 发件人邮箱，需要是已验证的域名
      to: recipient,
      subject: 'FlashTweet测试邮件 (SDK版本)',
      html: `
        <h1>FlashTweet通知测试</h1>
        <p>这是一封来自Resend SDK的测试邮件。</p>
        <p>如果您看到这封邮件，说明SDK调用成功！</p>
        <p>发送时间: ${new Date().toLocaleString()}</p>
      `,
    };
    
    log('发送请求中...');
    // 使用直接await方式获取响应
    try {
      const result = await resend.emails.send(data);
      log('API原始响应:');
      log(JSON.stringify(result, null, 2));
      
      if (result.error) {
        log('❌ 邮件发送失败!');
        log(`错误信息: ${JSON.stringify(result.error, null, 2)}`);
        return;
      }
      
      log('✅ 邮件发送成功!');
      // 根据实际响应结构获取ID
      const emailId = result.id || (result.data && result.data.id) || '未返回ID';
      log(`邮件ID: ${emailId}`);
    } catch (sendError) {
      log('❌ 邮件发送错误:');
      log(sendError.message);
      if (sendError.response) {
        log(`状态码: ${sendError.response.status}`);
        log(`响应体: ${JSON.stringify(sendError.response.data, null, 2)}`);
      }
    }
  } catch (error) {
    log(`⚠️ 发生异常: ${error.message}`);
    if (error.response) {
      log(`状态码: ${error.response.status}`);
      log(`响应体: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

// 执行测试
sendTestEmail(); 