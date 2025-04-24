import { NextResponse } from 'next/server';
import { twitterClient, emailClient, phoneClient, translationClient } from '@/lib/api-clients';
import { UserSettings, Tweet, NotificationLog } from '@/lib/types';
import { mockSettings, mockTweets } from '@/lib/mock-data';
// 引入DeepSeek客户端
const DeepSeekClient = require('@/lib/deepseek-client');

// 日志记录
function logInfo(message: string) {
  console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
}

function logError(message: string, error?: any) {
  console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
  if (error) {
    console.error(error);
  }
}

// This would be a real database in a production app
let settings = mockSettings;
let notificationLogs: NotificationLog[] = [];

// In a real app, this would be a scheduled function
// For this MVP, we'll make it an API endpoint that could be called by a cron job
export async function GET() {
  // 初始化DeepSeek客户端
  let deepseekClient: any;
  try {
    deepseekClient = new DeepSeekClient();
    logInfo('DeepSeek客户端初始化成功');
  } catch (error) {
    logError('DeepSeek客户端初始化失败，将使用模拟翻译', error);
  }

  try {
    // 1. Get all monitored accounts
    const accounts = settings.monitoredAccounts;
    const newTweets: Tweet[] = [];
    
    logInfo(`开始检查 ${accounts.length} 个监控账号的新推文`);
    
    // 2. Check each account for new tweets
    for (const account of accounts) {
      logInfo(`检查账号 @${account.username} 的新推文`);
      
      try {
        // In a real app, this would call the Twitter API
        // For now, we'll simulate finding a new tweet sometimes
        const shouldFindNewTweet = Math.random() > 0.7;
        
        if (shouldFindNewTweet) {
          // Simulate a new tweet
          const tweet = mockTweets[Math.floor(Math.random() * mockTweets.length)];
          logInfo(`发现账号 @${account.username} 的新推文: ${tweet.id}`);
          
          // 3. 使用DeepSeek分析推文内容和提供翻译
          let aiAnalysis = null;
          let isAiRelevant = false;
          let summary = null;
          let translation = null;
          
          try {
            if (deepseekClient) {
              logInfo(`使用DeepSeek分析推文内容...`);
              aiAnalysis = await deepseekClient.analyzeTweet(tweet);
              isAiRelevant = aiAnalysis.isRelevant;
              summary = aiAnalysis.summary;
              translation = aiAnalysis.translation;
              
              logInfo(`分析结果: AI相关=${isAiRelevant}, 标题=${summary?.substring(0, 20) || '无'}`);
            } else {
              // 使用模拟翻译
              logInfo(`使用模拟翻译...`);
              translation = await translationClient.translate(
                tweet.text,
                'en',
                'zh'
              );
            }
          } catch (error) {
            logError(`分析推文内容失败`, error);
            // 如果AI分析失败，继续使用模拟翻译
            translation = await translationClient.translate(
            tweet.text,
            'en',
            'zh'
          );
          }
          
          const newTweet: Tweet = {
            ...tweet,
            translation
          };
          
          // 仅保存和通知AI相关内容（如果启用了DeepSeek分析）
          if (!deepseekClient || isAiRelevant) {
          newTweets.push(newTweet);
          
            // 4. 发送通知（邮件标题使用AI生成的摘要，如果有）
            if (summary) {
              logInfo(`使用生成的标题发送通知: ${summary}`);
              await sendNotifications(newTweet, settings, summary);
            } else {
              logInfo(`使用默认标题发送通知`);
          await sendNotifications(newTweet, settings);
            }
          } else {
            logInfo(`跳过非AI相关内容的推文: ${tweet.id}`);
          }
          
          // 5. Update last checked time and tweet ID
          account.lastChecked = new Date().toISOString();
          account.lastTweetId = tweet.id;
        }
      } catch (error) {
        logError(`处理账号 @${account.username} 的推文时出错:`, error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `已检查 ${accounts.length} 个账号, 发现 ${newTweets.length} 条新推文`,
      newTweets 
    });
  } catch (error) {
    logError('监控路由执行错误:', error);
    return NextResponse.json(
      { success: false, message: '检查新推文失败' },
      { status: 500 }
    );
  }
}

async function sendNotifications(tweet: Tweet, settings: UserSettings, customSubject?: string) {
  const { notificationChannels, emailAddress, phoneNumber } = settings;
  
  // 准备邮件标题
  const emailSubject = customSubject || `来自 @${tweet.author.username} 的新推文`;
  
  // Send email notification
  if (notificationChannels.email && emailAddress) {
    try {
      logInfo(`发送邮件通知至 ${emailAddress}`);
      const emailSent = await emailClient.sendNotification(
        emailAddress,
        emailSubject,
        `
          ${tweet.text}
          
          ${tweet.translation ? `翻译: ${tweet.translation}` : ''}
          
          查看原文: https://twitter.com/${tweet.author.username}/status/${tweet.id}
        `
      );
      
      const log: NotificationLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        tweetId: tweet.id,
        accountName: tweet.author.username,
        notificationType: 'email',
        status: emailSent ? 'success' : 'failed'
      };
      
      notificationLogs.push(log);
      
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('notificationLogs', JSON.stringify(notificationLogs));
      }
      
      logInfo(`邮件通知发送${emailSent ? '成功' : '失败'}`);
    } catch (error) {
      logError('发送邮件通知失败:', error);
      
      const log: NotificationLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        tweetId: tweet.id,
        accountName: tweet.author.username,
        notificationType: 'email',
        status: 'failed',
        errorMessage: '发送邮件通知失败'
      };
      
      notificationLogs.push(log);
      
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('notificationLogs', JSON.stringify(notificationLogs));
      }
    }
  }
  
  // Send phone notification
  if (notificationChannels.phone && phoneNumber) {
    try {
      logInfo(`发送电话通知至 ${phoneNumber}`);
      const phoneMessage = customSubject || 
        `来自 ${tweet.author.name} 的新推文: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`;
        
      const phoneSent = await phoneClient.sendCallNotification(
        phoneNumber,
        phoneMessage
      );
      
      const log: NotificationLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        tweetId: tweet.id,
        accountName: tweet.author.username,
        notificationType: 'phone',
        status: phoneSent ? 'success' : 'failed'
      };
      
      notificationLogs.push(log);
      
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('notificationLogs', JSON.stringify(notificationLogs));
      }
      
      logInfo(`电话通知发送${phoneSent ? '成功' : '失败'}`);
    } catch (error) {
      logError('发送电话通知失败:', error);
      
      const log: NotificationLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        tweetId: tweet.id,
        accountName: tweet.author.username,
        notificationType: 'phone',
        status: 'failed',
        errorMessage: '连接电话服务失败'
      };
      
      notificationLogs.push(log);
      
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('notificationLogs', JSON.stringify(notificationLogs));
      }
    }
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}