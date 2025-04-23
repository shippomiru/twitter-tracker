#!/usr/bin/env node

const https = require('https');

// Resend API 配置
const RESEND_API_KEY = 're_fNpDFaCE_68eiHR86VJEsCqa2PwwaWggN'; // 已替换为实际的API密钥
const RESEND_API_URL = 'api.resend.com';
const RESEND_API_PATH = '/emails';

// 发送邮件的测试数据
const emailData = {
  from: 'onboarding@resend.dev', // 发件人邮箱，需要是已验证的域名
  to: '297029445@qq.com',        // 已替换为实际的收件邮箱
  subject: 'TweetWatcher测试邮件',
  html: `
    <h1>TweetWatcher通知测试</h1>
    <p>这是一封来自Resend API的测试邮件。</p>
    <p>如果您看到这封邮件，说明API调用成功！</p>
    <p>发送时间: ${new Date().toLocaleString()}</p>
  `,
};

// 记录启动信息
console.log('开始测试Resend API...');
console.log(`目标邮箱: ${emailData.to}`);

// 将数据转换为JSON字符串
const postData = JSON.stringify(emailData);

// 设置请求选项
const options = {
  hostname: RESEND_API_URL,
  port: 443,
  path: RESEND_API_PATH,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

// 创建请求
const req = https.request(options, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  
  let responseData = '';
  
  // 接收响应数据
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  // 响应结束
  res.on('end', () => {
    try {
      const parsedData = JSON.parse(responseData);
      console.log('API响应:');
      console.log(JSON.stringify(parsedData, null, 2));
      
      if (res.statusCode === 200) {
        console.log('✅ 邮件发送成功!');
      } else {
        console.log('❌ 邮件发送失败!');
      }
    } catch (e) {
      console.error('解析响应失败:', e.message);
      console.log('原始响应:', responseData);
    }
  });
});

// 错误处理
req.on('error', (e) => {
  console.error(`请求出错: ${e.message}`);
});

// 写入数据并结束请求
req.write(postData);
req.end();

console.log('请求已发送，等待响应...'); 