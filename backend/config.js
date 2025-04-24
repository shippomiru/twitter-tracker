// API配置
const X_API_BASE = process.env.X_API_BASE || 'https://api.twitter.com/2';
const BEARER_TOKEN = process.env.BEARER_TOKEN || 'AAAAAAAAAAAAAAAAAAAAAIAy0wEAAAAAvXPWtvFNdjRZAAtlzfjjXtXNgAA%3DrDr2GFLu6VWdnbWoeHkRPgzi5BrUyAwSW6ZtYzo6AfO16ufcKV';

// 监控配置
const MONITOR_CONFIG = {
  CHECK_INTERVAL: 15 * 60 * 1000, // 15分钟
  MAX_TWEETS_PER_CHECK: 5, // 每次检查获取5条推文（Twitter API要求最少5条）
  MAX_CHECKS_PER_USER: 2, // 每个用户最多检查2次
  API_RATE_LIMIT: {
    WINDOW: 15 * 60 * 1000, // 15分钟窗口
    MAX_REQUESTS: 1, // 15分钟内最多1次请求
    RETRY_AFTER: 15 * 60 * 1000, // 请求被限制后等待15分钟
  }
};

// 存储配置
const STORAGE_CONFIG = {
  USERS_KEY: 'monitored_users',
  TWEETS_KEY: 'latest_tweets',
  USER_IDS_KEY: 'user_ids_cache', // 添加用户ID缓存键
};

module.exports = {
  X_API_BASE,
  BEARER_TOKEN,
  MONITOR_CONFIG,
  STORAGE_CONFIG,
}; 