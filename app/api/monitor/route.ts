import { NextResponse } from 'next/server';
import { UserSettings, Tweet, NotificationLog } from '@/lib/types';
import { mockSettings, mockTweets } from '@/lib/mock-data';
// 引入监控服务和KV存储
const monitorService = require('@/lib/services/monitorService');
const kvStorage = require('@/lib/services/kvStorage');
const { log } = require('@/lib/services/utils');

// 添加API超时保护
const withTimeout = <T>(promise: Promise<T>, timeout = 50000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`操作超时，已执行${timeout/1000}秒`)), timeout)
    )
  ]);
};

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
  
  // 检查环境变量
  console.log(`[VERCEL_PHASE_CHECK] NEXT_PHASE=${process.env.NEXT_PHASE || '未设置'}`);
  console.log(`[VERCEL_PHASE_CHECK] VERCEL_ENV=${process.env.VERCEL_ENV || '未设置'}`);
  console.log(`[VERCEL_PHASE_CHECK] NODE_ENV=${process.env.NODE_ENV || '未设置'}`);

  try {
    // 从URL参数获取设置，而不是从localStorage
    const url = new URL(request.url);
    const settingsParam = url.searchParams.get('settings');
    const shouldReplace = url.searchParams.get('replace') === 'true';
    let settings = mockSettings;
    
    if (settingsParam) {
      try {
        console.log('[VERCEL_PARAMS] 从URL参数接收到settings');
        settings = JSON.parse(decodeURIComponent(settingsParam));
      } catch (parseError) {
        console.error('[VERCEL_PARAMS_ERROR] 解析settings参数失败:', parseError);
        return NextResponse.json({
          success: false,
          message: '解析settings参数失败'
        }, { status: 400 });
      }
    } else {
      console.log('[VERCEL_PARAMS] 未收到settings参数，使用默认设置');
    }
    
    // 记录环境和设置信息
    console.log(`[VERCEL_ENV] NODE_ENV=${process.env.NODE_ENV || '未设置'}, VERCEL=${process.env.VERCEL || '未设置'}`);
    console.log(`[VERCEL_CONFIG] 检查频率=${settings.checkFrequency || '默认'}, 监控账号数=${settings.monitoredAccounts?.length || 0}`);
    console.log(`[VERCEL_CONFIG] 邮件通知=${settings.notificationChannels?.email || false}, 电话通知=${settings.notificationChannels?.phone || false}`);
    console.log(`[VERCEL_CONFIG] 是否替换现有监控=${shouldReplace}`);
    
    // 检查并记录关键设置
    console.log(`[VERCEL_SETTINGS] 配置的邮箱: ${settings.emailAddress || '未设置'}`);
    console.log(`[VERCEL_SETTINGS] 配置的手机号: ${settings.phoneNumber || '未设置'}`);
    
    // 获取监控账号
    const accounts = settings.monitoredAccounts || [];
    
    // 如果没有监控账号，直接返回
    if (accounts.length === 0) {
      console.log('[VERCEL_MONITOR] 没有监控账号，跳过初始化');
      return NextResponse.json({ 
        success: true, 
        message: 'No accounts to monitor',
        monitorStatus: {
          initialized: false,
          accounts: []
        }
      });
    }

    // 如果请求要求替换现有监控，则清除所有现有监控
    if (shouldReplace) {
      console.log('[VERCEL_MONITOR] 清除所有现有监控账号');
      
      // 获取现有账号列表用于日志显示
      const existingUsers = await kvStorage.getAllUsers();
      const existingAccounts = Object.keys(existingUsers);
      const existingCount = existingAccounts.length;
      
      // 清空用户存储
      await monitorService.clearAllMonitoringAccounts();
      
      if (existingCount > 0) {
        console.log(`[VERCEL_MONITOR] 已清除 ${existingCount} 个现有监控账号: ${existingAccounts.join(', ')}`);
      }
    }
    
    // 更新监控服务的设置
    monitorService.updateSettings(settings);
    console.log(`[VERCEL_MONITOR] 已更新监控服务设置`);
    
    // 初始化监控任务，但不执行实际检查（因为Twitter API限制）
    const monitorStatus = {
      replaced: shouldReplace,
      initialized: true,
      accounts: await Promise.all(accounts.map(async account => {
        try {
          // 先通过Twitter API获取用户ID
          console.log(`[VERCEL_MONITOR] 查询Twitter API获取用户 ${account.username} 的ID`);
          const twitterService = require('@/lib/services/twitterService');
          const userInfo = await twitterService.getUserByUsername(account.username);
          console.log(`[VERCEL_MONITOR] 获取到用户ID: ${account.username} -> ${userInfo.id}`);
          
          // 使用获取到的用户ID添加到存储
          await kvStorage.addUser(account.username, userInfo.id);
          
          // 设置初始基线时间
          const baselineTime = new Date().toISOString();
          
          return {
            username: account.username,
            userId: userInfo.id,
            status: 'initialized',
            baselineTime,
            nextCheck: new Date(new Date().getTime() + 15 * 60 * 1000).toISOString()
          };
        } catch (error) {
          console.error(`[VERCEL_MONITOR_ERROR] 获取用户 ${account.username} 的ID失败:`, error instanceof Error ? error.message : String(error));
          return {
            username: account.username,
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })),
      systemStatus: {
        lastInitialized: new Date().toISOString(),
        nextScheduledRun: new Date(new Date().getTime() + 15 * 60 * 1000).toISOString()
      }
    };
    
    // 更新系统状态
    await kvStorage.saveSystemState({
      lastInitialized: new Date().toISOString(),
      monitoringActive: true
    });
    
    console.log(`[VERCEL_FUNCTION_END] 监控初始化完成，设置了 ${accounts.length} 个账号的监控`);
    return NextResponse.json({ 
      success: true, 
      message: `已设置 ${accounts.length} 个账号的监控，将在下一个周期检查新推文`,
      monitorStatus 
    });
  } catch (error) {
    console.error(`[VERCEL_CRITICAL_ERROR] 监控路由执行错误:`, error);
    // 记录详细的错误信息
    if (error instanceof Error) {
      console.error(`[VERCEL_CRITICAL_ERROR_DETAILS] 类型:${error.name}, 消息:${error.message}, 堆栈:${error.stack || '无堆栈'}`);
    }
    
    return NextResponse.json(
      { success: false, message: '设置监控失败', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}