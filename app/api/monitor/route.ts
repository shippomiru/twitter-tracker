import { NextResponse } from 'next/server';
import { twitterClient, emailClient, phoneClient, translationClient } from '@/lib/api-clients';
import { UserSettings, Tweet, NotificationLog } from '@/lib/types';
import { mockSettings, mockTweets } from '@/lib/mock-data';
// 引入监控服务
const monitorService = require('@/lib/services/monitorService');

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
  // 检查是否是构建环境
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ 
      success: true, 
      message: 'Build phase - skipping monitoring',
      newTweets: [] 
    });
  }

  try {
    // 1. 获取所有监控账号
    const accounts = settings.monitoredAccounts;
    const newTweets: Tweet[] = [];
    
    // 如果没有监控账号，直接返回
    if (accounts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No accounts to monitor',
        newTweets: [] 
      });
    }
    
    // 1.1 更新监控服务的设置
    monitorService.updateSettings(settings);
    
    logInfo(`开始检查 ${accounts.length} 个监控账号的新推文`);
    
    // 2. 处理每个账号
    for (const account of accounts) {
      logInfo(`检查账号 @${account.username} 的新推文`);
      
      try {
        // 在实际应用中，我们会调用Twitter API
        // 这里使用模拟数据测试
        const shouldFindNewTweet = Math.random() > 0.7;
        
        if (shouldFindNewTweet) {
          // 模拟一条新推文
          const tweet = mockTweets[Math.floor(Math.random() * mockTweets.length)];
          logInfo(`发现账号 @${account.username} 的新推文: ${tweet.id}`);
          
          // 3. 使用monitorService处理新推文
          await monitorService.processNewTweetNotification(account.username, tweet);
          
          // 记录推文
          newTweets.push({
            ...tweet,
            translation: '通过monitorService处理' // 这里只是为了表明已经处理
          });
          
          // 4. 更新最后检查时间和推文ID
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

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}