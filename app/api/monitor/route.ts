import { NextResponse } from 'next/server';
import { twitterClient, emailClient, phoneClient, translationClient } from '@/lib/api-clients';
import { UserSettings, Tweet, NotificationLog } from '@/lib/types';
import { mockSettings, mockTweets } from '@/lib/mock-data';
// 引入监控服务
const monitorService = require('@/lib/services/monitorService');
const twitterService = require('@/lib/services/twitterService');
const { log } = require('@/lib/services/utils');

// 日志记录
function logInfo(message: string) {
  console.log(`[${new Date().toISOString()}] [INFO] ${message}`);
  
  // 在Vercel环境中额外添加日志
  if (typeof process !== 'undefined' && process.env.VERCEL) {
    console.log(`TWITTER_MONITOR_API: ${message}`);
  }
}

function logError(message: string, error?: any) {
  console.error(`[${new Date().toISOString()}] [ERROR] ${message}`);
  if (error) {
    console.error(error);
  }
  
  // 在Vercel环境中额外添加日志
  if (typeof process !== 'undefined' && process.env.VERCEL) {
    console.error(`TWITTER_MONITOR_API_ERROR: ${message}`);
    if (error) {
      console.error(`TWITTER_MONITOR_API_ERROR_DETAILS: ${JSON.stringify(error)}`);
    }
  }
}

// 保存设置到持久化存储（目前使用内存变量模拟）
// This would be a real database in a production app
let settings = mockSettings;
let notificationLogs: NotificationLog[] = [];

// In a real app, this would be a scheduled function
// For this MVP, we'll make it an API endpoint that could be called by a cron job
export async function GET() {
  // 检查是否是构建环境
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    logInfo('检测到构建环境，跳过监控执行');
    return NextResponse.json({ 
      success: true, 
      message: 'Build phase - skipping monitoring',
      newTweets: [] 
    });
  }

  try {
    // 记录API调用开始
    logInfo('=== 监控API调用开始 ===');
    logInfo(`环境检测: NODE_ENV=${process.env.NODE_ENV}, VERCEL=${process.env.VERCEL ? 'true' : 'false'}`);
    
    // 尝试从localStorage获取用户设置（如果在客户端）
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
          settings = JSON.parse(savedSettings);
          logInfo('从localStorage加载了用户设置');
        }
      } catch (error) {
        logError('从localStorage读取设置失败', error);
      }
    }
    
    // 1. 获取所有监控账号
    const accounts = settings.monitoredAccounts;
    const newTweets: Tweet[] = [];
    
    // 记录设置信息
    logInfo(`当前设置: ${JSON.stringify({
      emailEnabled: settings.notificationChannels?.email,
      phoneEnabled: settings.notificationChannels?.phone,
      checkFrequency: settings.checkFrequency,
      accountsCount: accounts.length
    })}`);
    
    // 如果没有监控账号，直接返回
    if (accounts.length === 0) {
      logInfo('没有监控账号，跳过检查');
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
      logInfo(`==== 开始处理账号 @${account.username} ====`);
      
      try {
        // 2.1 添加监控用户（如果还没有添加）
        logInfo(`尝试添加监控用户: ${account.username}`);
        const addResult = await monitorService.addUser(account.username);
        logInfo(`添加用户结果: ${addResult ? '成功' : '已存在'}`);
        
        // 2.2 检查用户最新推文
        logInfo(`开始检查用户 ${account.username} 的新推文`);
        await monitorService.checkUser(account.username);
        
        // 2.3 更新最后检查时间
        account.lastChecked = new Date().toISOString();
        logInfo(`更新最后检查时间: ${account.lastChecked}`);
        
        // 获取用户最新推文ID以更新lastTweetId
        const latestTweets = monitorService.storage.getLatestTweets(account.username);
        if (latestTweets && latestTweets.length > 0) {
          account.lastTweetId = latestTweets[0].id;
          logInfo(`更新最后推文ID: ${account.lastTweetId}`);
          
          // 添加到返回结果
          newTweets.push(...latestTweets.map((tweet: any) => ({
            ...tweet,
            translation: '已通过monitorService处理'
          })));
        }
      } catch (error) {
        logError(`处理账号 @${account.username} 的推文时出错:`, error);
      }
    }
    
    // 3. 保存更新后的设置
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('userSettings', JSON.stringify(settings));
        logInfo('已将更新后的设置保存到localStorage');
      } catch (saveError) {
        logError('保存设置到localStorage失败', saveError);
      }
    }
    
    logInfo(`=== 监控API调用完成 ===`);
    return NextResponse.json({ 
      success: true, 
      message: `已检查 ${accounts.length} 个账号, 发现 ${newTweets.length} 条新推文`,
      newTweets 
    });
  } catch (error) {
    logError('监控路由执行错误:', error);
    // 记录详细的错误信息
    if (error instanceof Error) {
      logError(`错误类型: ${error.name}, 错误消息: ${error.message}, 堆栈: ${error.stack}`);
    }
    
    return NextResponse.json(
      { success: false, message: '检查新推文失败', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}