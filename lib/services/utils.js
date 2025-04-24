// 日志函数
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}

// 存储管理
class StorageManager {
  constructor() {
    this.users = new Map();
    this.tweets = new Map();
    this.userIds = new Map(); // 添加用户ID缓存
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
  }

  // 获取用户ID（优先从缓存获取）
  getUserId(username) {
    return this.userIds.get(username);
  }

  // 获取监控用户
  getUser(username) {
    return this.users.get(username);
  }

  // 更新用户检查次数
  incrementCheckCount(username) {
    const user = this.getUser(username);
    if (user) {
      user.checkCount++;
      log(`用户 ${username} 检查次数: ${user.checkCount}`);
    }
  }

  // 检查是否达到最大检查次数
  hasReachedMaxChecks(username) {
    const user = this.getUser(username);
    return user && user.checkCount >= process.env.MAX_CHECKS_PER_USER;
  }

  // 保存最新推文
  saveLatestTweets(username, tweets) {
    this.tweets.set(username, tweets);
    log(`保存用户 ${username} 的最新推文`);
  }

  // 获取最新推文
  getLatestTweets(username) {
    return this.tweets.get(username) || [];
  }

  // 检查新推文
  checkNewTweets(username, tweets) {
    const user = this.getUser(username);
    if (!user) return [];

    const baselineTime = new Date(user.baselineTime);
    const newTweets = tweets.filter(tweet => 
      new Date(tweet.created_at) > baselineTime
    );

    if (newTweets.length > 0) {
      log(`发现用户 ${username} 的新推文: ${newTweets.length} 条`);
      log(`Baseline时间: ${user.baselineTime}`);
    }

    return newTweets;
  }
}

module.exports = {
  log,
  storage: new StorageManager()
}; 