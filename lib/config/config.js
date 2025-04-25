// API配置
const X_API_BASE = process.env.TWITTER_API_BASE || 'https://api.twitter.com/2';
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

// 监控配置
const MONITOR_CONFIG = {
  CHECK_INTERVAL: parseInt(process.env.CHECK_INTERVAL) || 30 * 60 * 1000, // 30分钟
  MAX_TWEETS_PER_CHECK: parseInt(process.env.MAX_TWEETS_PER_CHECK) || 5, // 每次检查获取5条推文
  MAX_CHECKS_PER_USER: parseInt(process.env.MAX_CHECKS_PER_USER) || 2, // 每个用户最多检查2次
  API_RATE_LIMIT: {
    WINDOW: parseInt(process.env.API_RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15分钟窗口
    MAX_REQUESTS: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 1, // 15分钟内最多1次请求
    RETRY_AFTER: parseInt(process.env.API_RATE_LIMIT_RETRY_AFTER) || 15 * 60 * 1000, // 请求被限制后等待15分钟
  },
  // 通知配置
  NOTIFICATION: {
    MAX_ATTEMPTS: parseInt(process.env.MAX_NOTIFICATION_ATTEMPTS) || 3, // 最大通知尝试次数
  }
};

// 存储配置
const STORAGE_CONFIG = {
  USERS_KEY: 'monitored_users',
  TWEETS_KEY: 'latest_tweets',
  USER_IDS_KEY: 'user_ids_cache',
  TWEET_RECORDS_KEY: 'tweet_records',
  USER_PENDING_TWEETS_KEY: 'user_pending_tweets'
};

// 飞书配置
const FEISHU_CONFIG = {
  APP_ID: process.env.FEISHU_APP_ID,
  APP_SECRET: process.env.FEISHU_APP_SECRET,
  USER_PHONE: process.env.FEISHU_USER_PHONE,
};

// 邮件配置
const EMAIL_CONFIG = {
  SERVICE: process.env.EMAIL_SERVICE,
  API_KEY: process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY,
  DEFAULT_FROM: process.env.EMAIL_FROM || 'Flashtweet <notify@flashtweet.online>',
  DEFAULT_TO: process.env.EMAIL_TO || process.env.DEFAULT_EMAIL_TO
};

module.exports = {
  X_API_BASE,
  BEARER_TOKEN,
  MONITOR_CONFIG,
  STORAGE_CONFIG,
  FEISHU_CONFIG,
  EMAIL_CONFIG,
}; 