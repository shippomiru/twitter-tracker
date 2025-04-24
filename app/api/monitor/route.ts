import { NextResponse } from 'next/server';
import { twitterClient, emailClient, phoneClient, translationClient } from '@/lib/api-clients';
import { UserSettings, Tweet, NotificationLog } from '@/lib/types';
import { mockSettings, mockTweets } from '@/lib/mock-data';
// 引入监控服务
const monitorService = require('@/lib/services/monitorService');
const twitterService = require('@/lib/services/twitterService');
const { log } = require('@/lib/services/utils');

// 日志记录 - 确保在服务器端始终执行
function logInfo(message: string) {
  // 使用console.log确保在Vercel Functions中显示
  console.log(`[VERCEL_LOG][${new Date().toISOString()}] [INFO] ${message}`);
}

function logError(message: string, error?: any) {
  // 使用console.error确保错误在Vercel中被捕获
  console.error(`[VERCEL_LOG][${new Date().toISOString()}] [ERROR] ${message}`);
  if (error) {
    console.error(`[VERCEL_LOG][ERROR_DETAILS] ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
  }
}

// 这里设置默认的配置，Vercel服务器端无法访问localStorage
let settings = mockSettings;
let notificationLogs: NotificationLog[] = [];

// API端点 - 在Vercel上作为serverless函数执行
export async function GET(request: Request) {
  // 立即记录API调用，确保在Vercel日志中看到
  console.log(`[VERCEL_FUNCTION_START] Twitter Monitor API called at ${new Date().toISOString()}`);
  
  // 测试环境变量和其他问题
  try {
    // 使用所有可能的日志级别，确保Vercel能捕获到日志
    console.info('[VERCEL_TEST_INFO] 这是info级别日志 - Monitor API');
    console.warn('[VERCEL_TEST_WARN] 这是warn级别日志 - Monitor API');
    console.error('[VERCEL_TEST_ERROR] 这是error级别日志 - Monitor API');
    
    // 检查请求URL，确认查询参数获取正常
    try {
      const url = new URL(request.url);
      console.log(`[VERCEL_REQUEST] 完整URL: ${url.toString()}`);
      console.log(`[VERCEL_REQUEST] 路径: ${url.pathname}`);
      console.log(`[VERCEL_REQUEST] 查询参数数量: ${url.searchParams.toString().length > 0 ? '有' : '无'}`);
      
      const hasSettings = url.searchParams.has('settings');
      console.log(`[VERCEL_REQUEST] 是否有settings参数: ${hasSettings ? '是' : '否'}`);
      
      if (hasSettings) {
        const settingsLength = url.searchParams.get('settings')?.length || 0;
        console.log(`[VERCEL_REQUEST] settings参数长度: ${settingsLength}`);
        
        if (settingsLength > 5000) {
          console.warn(`[VERCEL_REQUEST_WARN] settings参数可能过大 (${settingsLength} 字符)`);
        }
      }
    } catch (urlError) {
      console.error(`[VERCEL_REQUEST_ERROR] 解析请求URL出错:`, urlError);
    }
  } catch (testError) {
    console.error(`[VERCEL_TEST_CRITICAL] 测试日志出错:`, testError);
  }
  
  // 检查是否是构建环境
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('[VERCEL_BUILD] 检测到构建环境，跳过监控执行');
    return NextResponse.json({ 
      success: true, 
      message: 'Build phase - skipping monitoring',
      newTweets: [] 
    });
  }

  try {
    // 从URL参数获取设置，而不是从localStorage
    const url = new URL(request.url);
    const settingsParam = url.searchParams.get('settings');
    
    if (settingsParam) {
      try {
        console.log('[VERCEL_PARAMS] 从URL参数接收到settings');
        settings = JSON.parse(decodeURIComponent(settingsParam));
      } catch (parseError) {
        console.error('[VERCEL_PARAMS_ERROR] 解析settings参数失败:', parseError);
      }
    } else {
      console.log('[VERCEL_PARAMS] 未收到settings参数，使用默认设置');
    }
    
    // 记录环境和设置信息
    console.log(`[VERCEL_ENV] NODE_ENV=${process.env.NODE_ENV || '未设置'}, VERCEL=${process.env.VERCEL || '未设置'}`);
    console.log(`[VERCEL_CONFIG] 检查频率=${settings.checkFrequency || '默认'}, 监控账号数=${settings.monitoredAccounts?.length || 0}`);
    console.log(`[VERCEL_CONFIG] 邮件通知=${settings.notificationChannels?.email || false}, 电话通知=${settings.notificationChannels?.phone || false}`);
    
    // 1. 获取所有监控账号
    const accounts = settings.monitoredAccounts || [];
    const newTweets: Tweet[] = [];
    
    // 如果没有监控账号，直接返回
    if (accounts.length === 0) {
      console.log('[VERCEL_MONITOR] 没有监控账号，跳过检查');
      return NextResponse.json({ 
        success: true, 
        message: 'No accounts to monitor',
        newTweets: [] 
      });
    }
    
    // 1.1 更新监控服务的设置
    monitorService.updateSettings(settings);
    console.log(`[VERCEL_MONITOR] 已更新监控服务设置`);
    
    console.log(`[VERCEL_MONITOR] 开始检查 ${accounts.length} 个监控账号的新推文`);
    
    // 2. 处理每个账号
    for (const account of accounts) {
      console.log(`[VERCEL_ACCOUNT] 开始处理账号 @${account.username}`);
      
      try {
        // 2.1 添加监控用户（如果还没有添加）
        console.log(`[VERCEL_ADD_USER] 尝试添加监控用户: ${account.username}`);
        const addResult = await monitorService.addUser(account.username);
        console.log(`[VERCEL_ADD_USER] 添加用户结果: ${addResult ? '成功' : '已存在'}`);
        
        // 2.2 检查用户最新推文
        console.log(`[VERCEL_CHECK_TWEETS] 开始检查用户 ${account.username} 的新推文`);
        await monitorService.checkUser(account.username);
        
        // 2.3 更新最后检查时间
        account.lastChecked = new Date().toISOString();
        console.log(`[VERCEL_UPDATE] 更新最后检查时间: ${account.lastChecked}`);
        
        // 获取用户最新推文ID以更新lastTweetId
        const latestTweets = monitorService.storage.getLatestTweets(account.username);
        if (latestTweets && latestTweets.length > 0) {
          account.lastTweetId = latestTweets[0].id;
          console.log(`[VERCEL_UPDATE] 更新最后推文ID: ${account.lastTweetId}`);
          
          // 添加到返回结果
          newTweets.push(...latestTweets.map((tweet: any) => ({
            ...tweet,
            translation: '已通过monitorService处理'
          })));
          
          console.log(`[VERCEL_TWEETS] 用户 ${account.username} 发现 ${latestTweets.length} 条推文`);
        } else {
          console.log(`[VERCEL_TWEETS] 用户 ${account.username} 未发现新推文`);
        }
      } catch (error) {
        console.error(`[VERCEL_ERROR] 处理账号 @${account.username} 出错:`, error);
        if (error instanceof Error) {
          console.error(`[VERCEL_ERROR_DETAILS] 类型:${error.name}, 消息:${error.message}, 堆栈:${error.stack}`);
        }
      }
    }
    
    console.log(`[VERCEL_FUNCTION_END] 监控API调用完成，发现 ${newTweets.length} 条新推文`);
    return NextResponse.json({ 
      success: true, 
      message: `已检查 ${accounts.length} 个账号, 发现 ${newTweets.length} 条新推文`,
      newTweets 
    });
  } catch (error) {
    console.error(`[VERCEL_CRITICAL_ERROR] 监控路由执行错误:`, error);
    // 记录详细的错误信息
    if (error instanceof Error) {
      console.error(`[VERCEL_CRITICAL_ERROR_DETAILS] 类型:${error.name}, 消息:${error.message}, 堆栈:${error.stack || '无堆栈'}`);
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