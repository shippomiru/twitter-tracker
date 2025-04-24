import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 尝试写入文件日志（仅用于诊断Vercel环境问题）
const tryWriteLog = (message: string) => {
  try {
    const logMessage = `[${new Date().toISOString()}] ${message}\n`;
    const logPath = path.join('/tmp', 'debug-log.txt');
    fs.appendFileSync(logPath, logMessage);
    return true;
  } catch (error) {
    console.error(`无法写入日志文件: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

// 简单的ping接口，用于验证API调用和日志是否正常
export async function GET() {
  try {
    // 记录多个不同类型的日志，确保Vercel能捕获到
    console.log('[VERCEL_PING] 诊断接口被调用');
    console.info('[VERCEL_PING_INFO] 这是一条info级别日志');
    console.warn('[VERCEL_PING_WARN] 这是一条warn级别日志');
    console.error('[VERCEL_PING_ERROR] 这是一条error级别日志');
    
    // 尝试写入文件日志
    const logWriteResult = tryWriteLog('诊断API被调用');
    
    // 收集重要的环境信息
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV, 
      NEXT_PHASE: process.env.NEXT_PHASE,
      VERCEL_URL: process.env.VERCEL_URL,
      VERCEL_REGION: process.env.VERCEL_REGION,
      
      // API相关环境变量（仅显示是否设置，不显示具体值）
      TWITTER_API_BASE: process.env.TWITTER_API_BASE ? '已设置' : '未设置',
      TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN ? '已设置' : '未设置',
      CHECK_INTERVAL: process.env.CHECK_INTERVAL ? '已设置' : '未设置',
      
      // 服务器信息
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      
      // 文件系统权限
      hasWriteAccess: logWriteResult
    };
    
    // 记录环境变量信息
    console.log(`[VERCEL_ENV_CHECK] 环境信息: ${JSON.stringify(envInfo)}`);
    
    return NextResponse.json({
      success: true,
      message: 'Ping successful',
      timestamp: new Date().toISOString(),
      env: envInfo
    });
  } catch (error) {
    console.error('[VERCEL_PING_CRITICAL] 诊断接口出错:', error);
    
    return NextResponse.json({
      success: false,
      message: '诊断接口出错',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 