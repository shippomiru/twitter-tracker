#!/usr/bin/env node

const { Resend } = require('resend');

// Resend API配置
const RESEND_API_KEY = 're_fNpDFaCE_68eiHR86VJEsCqa2PwwaWggN';
const resend = new Resend(RESEND_API_KEY);

// 收件人邮箱
const RECIPIENT_EMAIL = '297029445@qq.com';

// 模拟Tweet数据结构
const mockTweet = {
  id: '1586405313696333825',
  text: "We're back up now! We continue to see promising progress with @search. We'll tackle some more challenges tomorrow, and this was a good experience for us to learn from. Thanks to the team working round the clock on improving this.",
  createdAt: new Date().toISOString(),
  author: {
    username: 'elonmusk',
    name: 'Elon Musk',
    profileImageUrl: 'https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg',
  },
  translation: "我们现在恢复了！我们继续看到@search取得的可喜进展。我们明天将解决更多挑战，这对我们来说是一次很好的学习经验。感谢团队夜以继日地改进这一点。"
};

// 日志函数
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// 生成邮件HTML内容
function generateEmailHtml(tweet) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TweetWatcher通知</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      margin: 0; 
      padding: 0;
      background-color: #f5f8fa;
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      background-color: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header { 
      background-color: #1da1f2; 
      color: white; 
      padding: 20px;
      text-align: center;
    }
    .content { padding: 20px; }
    .tweet-card {
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .author {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      margin-right: 10px;
    }
    .author-info {
      display: flex;
      flex-direction: column;
    }
    .author-name {
      font-weight: bold;
      font-size: 16px;
      margin: 0;
    }
    .author-username {
      color: #657786;
      font-size: 14px;
      margin: 0;
    }
    .tweet-text {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 15px;
    }
    .translation {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-top: 10px;
      border-left: 4px solid #1da1f2;
    }
    .translation-title {
      font-weight: bold;
      margin-bottom: 5px;
      color: #657786;
    }
    .footer {
      padding: 15px;
      text-align: center;
      font-size: 12px;
      color: #657786;
      border-top: 1px solid #e1e8ed;
    }
    .view-btn {
      display: inline-block;
      background-color: #1da1f2;
      color: white;
      padding: 8px 16px;
      border-radius: 50px;
      text-decoration: none;
      font-weight: bold;
      margin-top: 10px;
    }
    .timestamp {
      color: #657786;
      font-size: 14px;
      margin-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TweetWatcher 推文通知</h1>
    </div>
    <div class="content">
      <p>@${tweet.author.username} 发布了新推文:</p>
      
      <div class="tweet-card">
        <div class="author">
          <img src="${tweet.author.profileImageUrl}" class="avatar" alt="${tweet.author.name}">
          <div class="author-info">
            <p class="author-name">${tweet.author.name}</p>
            <p class="author-username">@${tweet.author.username}</p>
          </div>
        </div>
        
        <div class="tweet-text">
          ${tweet.text}
        </div>
        
        ${tweet.translation ? `
        <div class="translation">
          <div class="translation-title">中文翻译:</div>
          ${tweet.translation}
        </div>
        ` : ''}
        
        <a href="https://twitter.com/${tweet.author.username}/status/${tweet.id}" class="view-btn">
          在Twitter上查看
        </a>
        
        <div class="timestamp">
          发布时间: ${new Date(tweet.createdAt).toLocaleString()}
        </div>
      </div>
      
      <p>感谢使用TweetWatcher服务，如需取消订阅，请在设置中修改。</p>
    </div>
    <div class="footer">
      &copy; 2025 TweetWatcher. 保留所有权利。
    </div>
  </div>
</body>
</html>
  `;
}

// 发送推文通知邮件
async function sendTweetNotification(tweet, recipientEmail) {
  try {
    log(`准备发送推文通知邮件给 ${recipientEmail}`);
    
    const emailContent = generateEmailHtml(tweet);
    
    const data = {
      from: 'onboarding@resend.dev',
      to: recipientEmail,
      subject: `TweetWatcher: ${tweet.author.name} (@${tweet.author.username}) 发布了新推文`,
      html: emailContent,
    };
    
    log('发送邮件中...');
    const result = await resend.emails.send(data);
    
    if (result.error) {
      log('❌ 邮件发送失败!');
      log(`错误信息: ${JSON.stringify(result.error, null, 2)}`);
      return false;
    }
    
    const emailId = result.id || '未知ID';
    log(`✅ 邮件发送成功! ID: ${emailId}`);
    return true;
  } catch (error) {
    log(`⚠️ 发送邮件时发生错误: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  log('开始测试Tweet通知邮件发送...');
  const success = await sendTweetNotification(mockTweet, RECIPIENT_EMAIL);
  log(`测试${success ? '成功' : '失败'}`);
}

// 执行主函数
main(); 