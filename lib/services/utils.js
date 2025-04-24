// 日志函数
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const logPrefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  // 添加更详细的日志，确保在Vercel环境中也能显示
  if (level === 'error') {
    console.error(`${logPrefix} ${message}`);
  } else if (level === 'warn') {
    console.warn(`${logPrefix} ${message}`);
  } else {
    console.log(`${logPrefix} ${message}`);
  }
  
  // 在Vercel环境中额外添加日志，确保捕获所有信息
  if (typeof process !== 'undefined' && process.env.VERCEL) {
    // 记录到Vercel日志系统
    const logMessage = `TWITTER_MONITOR: ${logPrefix} ${message}`;
    console.log(logMessage);
    
    // 错误信息额外记录一次，确保被捕获
    if (level === 'error' || level === 'warn') {
      console.error(`CRITICAL: ${logMessage}`);
    }
  }
}

// 存储管理
class StorageManager {
  constructor() {
    this.users = new Map();
    this.tweets = new Map();
    this.userIds = new Map(); // 添加用户ID缓存
    this.notificationLogs = [];
    
    // 系统状态初始化
    this.systemState = {
      isRunning: false,
      lastRun: null,
      lastCompleted: null,
      lastError: null, 
      lastErrorMessage: null,
      totalChecks: 0,
      monitoringActive: false
    };
    
    // 记录初始化日志
    log('StorageManager初始化完成', 'info');
    
    // 检查环境
    if (typeof process !== 'undefined') {
      log(`当前运行环境: ${process.env.NODE_ENV || '未知'}`, 'info');
      log(`是否在Vercel环境: ${process.env.VERCEL ? '是' : '否'}`, 'info');
    }
  }

  // 添加监控用户
  addUser(username, userId) {
    const userInfo = {
      userId,
      username,
      baselineTime: new Date().toISOString(), // 记录当前时间作为baseline
      checkCount: 0
    };
    this.users.set(username, userInfo);
    this.userIds.set(username, userId); // 缓存用户ID
    log(`添加监控用户: ${username} (${userId})`);
    log(`设置baseline时间: ${userInfo.baselineTime}`);
    
    // 记录用户总数
    log(`当前监控用户总数: ${this.users.size}`);
  }

  // 获取用户ID（优先从缓存获取）
  getUserId(username) {
    const userId = this.userIds.get(username);
    log(`获取用户ID: ${username} -> ${userId || '未找到'}`);
    return userId;
  }

  // 获取监控用户
  getUser(username) {
    const user = this.users.get(username);
    log(`获取用户信息: ${username} -> ${user ? '成功' : '未找到'}`);
    return user;
  }

  // 更新用户检查次数
  incrementCheckCount(username) {
    const user = this.getUser(username);
    if (user) {
      user.checkCount++;
      log(`用户 ${username} 检查次数: ${user.checkCount}`);
    } else {
      log(`无法更新检查次数，用户 ${username} 未找到`, 'warn');
    }
  }

  // 检查是否达到最大检查次数
  hasReachedMaxChecks(username) {
    const user = this.getUser(username);
    const maxChecks = process.env.MAX_CHECKS_PER_USER || Infinity;
    const result = user && user.checkCount >= maxChecks;
    
    if (result) {
      log(`用户 ${username} 已达到最大检查次数 ${maxChecks}`, 'warn');
    }
    
    return result;
  }

  // 保存最新推文
  saveLatestTweets(username, tweets) {
    this.tweets.set(username, tweets);
    log(`保存用户 ${username} 的最新推文: ${tweets.length} 条`);
    
    // 记录详细信息
    if (tweets.length > 0) {
      log(`最新推文ID: ${tweets[0].id}, 时间: ${tweets[0].created_at}`);
    }
  }

  // 获取最新推文
  getLatestTweets(username) {
    const tweets = this.tweets.get(username) || [];
    log(`获取用户 ${username} 的最新推文: ${tweets.length} 条`);
    return tweets;
  }

  // 检查新推文
  checkNewTweets(username, tweets) {
    const user = this.getUser(username);
    if (!user) {
      log(`无法检查新推文，用户 ${username} 未找到`, 'warn');
      return [];
    }

    const baselineTime = new Date(user.baselineTime);
    log(`检查新推文，基线时间: ${baselineTime.toISOString()}`);
    
    const newTweets = tweets.filter(tweet => 
      new Date(tweet.created_at) > baselineTime
    );

    if (newTweets.length > 0) {
      log(`发现用户 ${username} 的新推文: ${newTweets.length} 条`, 'success');
      log(`Baseline时间: ${user.baselineTime}`);
      
      // 记录每条新推文的详细信息
      newTweets.forEach((tweet, index) => {
        log(`新推文 #${index + 1} - ID: ${tweet.id}, 发布时间: ${tweet.created_at}`);
      });
    } else {
      log(`未发现用户 ${username} 的新推文`);
    }

    return newTweets;
  }
  
  // 添加用户初始化方法
  initializeUser(username) {
    if (!this.users.has(username)) {
      log(`创建新的监控用户: ${username}`, 'info');
      this.users.set(username, {
        checkCount: 0,
        status: 'pending'
      });
    }
    return this.users.get(username);
  }

  // 设置用户基线时间
  setUserBaseline(username, timestamp) {
    const user = this.users.get(username);
    if (user) {
      user.baselineTime = timestamp;
      log(`设置baseline时间: ${timestamp}`, 'info');
    }
  }

  // 更新用户最后检查时间
  updateUserLastChecked(username) {
    const user = this.users.get(username);
    if (user) {
      user.lastChecked = new Date().toISOString();
      user.checkCount = (user.checkCount || 0) + 1;
    }
  }

  // 获取新推文（比基线时间更新的）
  getNewTweets(username) {
    const user = this.users.get(username);
    if (!user || !user.baselineTime) return [];
    
    const tweets = this.getLatestTweets(username) || [];
    const baselineTime = new Date(user.baselineTime);
    
    return tweets.filter(tweet => {
      const tweetTime = new Date(tweet.created_at);
      return tweetTime > baselineTime;
    });
  }

  // 获取通知日志
  getNotificationLogs() {
    return this.notificationLogs || [];
  }

  // 清除所有用户数据
  clearAllUsers() {
    console.log('[STORAGE] 清除所有用户数据');
    this.users.clear();
    console.log('[STORAGE] 用户数据已清除');
  }
}

module.exports = {
  log,
  storage: new StorageManager()
}; 