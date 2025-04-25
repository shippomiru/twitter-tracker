const { log } = require('./utils');
const { Redis } = require('@upstash/redis');

// Redis键名
const TWEET_RECORDS_KEY = 'tweet_records';          // 存储所有推文记录
const USER_PENDING_TWEETS_KEY = 'user_pending_tweets'; // 存储用户待通知的推文ID
const MAX_NOTIFICATION_ATTEMPTS = 3;                // 最大通知尝试次数

// 获取Redis客户端
const getRedisClient = () => {
  // 优先使用Upstash Redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('[TWEET_RECORD] 使用Upstash Redis连接');
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  
  // 如果没有配置，返回一个内存存储的模拟客户端
  console.warn('[TWEET_RECORD] 未找到Redis配置，使用内存存储（仅用于开发环境）');
  return createMemoryMockClient();
};

// 创建内存模拟客户端
const createMemoryMockClient = () => {
  const store = {};
  return {
    get: async (key) => store[key],
    set: async (key, value) => {
      store[key] = value;
      return 'OK';
    },
    hget: async (key, field) => {
      if (!store[key]) return null;
      return store[key][field];
    },
    hset: async (key, field, value) => {
      if (!store[key]) store[key] = {};
      store[key][field] = value;
      return 'OK';
    },
    hdel: async (key, field) => {
      if (!store[key]) return 0;
      if (store[key][field]) {
        delete store[key][field];
        return 1;
      }
      return 0;
    },
    hgetall: async (key) => {
      return store[key] || {};
    },
    del: async (key) => {
      delete store[key];
      return 1;
    }
  };
};

// Redis客户端实例
const redisClient = getRedisClient();

/**
 * 推文记录服务
 * 管理推文的处理状态和通知状态
 */
class TweetRecordService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  // 初始化
  async init() {
    try {
      this.initialized = true;
      log(`[TWEET_RECORD] 推文记录服务初始化完成`);
    } catch (error) {
      log(`[TWEET_RECORD] 初始化失败: ${error.message}`, 'error');
    }
  }

  // 确保初始化完成
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  // 保存推文记录
  async saveTweetRecord(tweetData) {
    await this.ensureInitialized();
    
    if (!tweetData || !tweetData.id) {
      log(`[TWEET_RECORD] 保存失败: 无效的推文数据`, 'error');
      return false;
    }
    
    try {
      // 尝试获取现有记录
      const existingRecord = await this.getTweetRecord(tweetData.id);
      
      // 创建或更新记录
      const record = {
        tweet_id: tweetData.id,
        username: tweetData.author?.username || tweetData.username,
        created_at: tweetData.created_at,
        text: tweetData.text,
        ai_processed: existingRecord?.ai_processed || {
          summary: '',
          translation: '',
          is_ai_related: false,
          processed_at: null
        },
        notification_status: existingRecord?.notification_status || {
          notified: false,
          attempts: 0,
          last_attempt_at: null,
          channels: {
            email: false,
            feishu: false
          }
        }
      };
      
      // 保存记录
      await redisClient.hset(TWEET_RECORDS_KEY, tweetData.id, JSON.stringify(record));
      log(`[TWEET_RECORD] 已保存推文记录: ${tweetData.id}`);
      
      return true;
    } catch (error) {
      log(`[TWEET_RECORD] 保存推文记录失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 获取推文记录
  async getTweetRecord(tweetId) {
    await this.ensureInitialized();
    
    try {
      const recordJson = await redisClient.hget(TWEET_RECORDS_KEY, tweetId);
      if (!recordJson) {
        return null;
      }
      
      return JSON.parse(recordJson);
    } catch (error) {
      log(`[TWEET_RECORD] 获取推文记录失败: ${error.message}`, 'error');
      return null;
    }
  }

  // 更新推文的AI处理结果
  async updateTweetAIResults(tweetId, aiResults) {
    await this.ensureInitialized();
    
    try {
      const record = await this.getTweetRecord(tweetId);
      if (!record) {
        log(`[TWEET_RECORD] 更新AI结果失败: 未找到推文记录 ${tweetId}`, 'error');
        return false;
      }
      
      record.ai_processed = {
        summary: aiResults.summary || '',
        translation: aiResults.translation || '',
        is_ai_related: aiResults.is_ai_related || false,
        processed_at: new Date().toISOString()
      };
      
      await redisClient.hset(TWEET_RECORDS_KEY, tweetId, JSON.stringify(record));
      log(`[TWEET_RECORD] 已更新推文AI处理结果: ${tweetId}`);
      
      return true;
    } catch (error) {
      log(`[TWEET_RECORD] 更新推文AI结果失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 更新推文的通知状态
  async updateTweetNotificationStatus(tweetId, notificationResult) {
    await this.ensureInitialized();
    
    try {
      const record = await this.getTweetRecord(tweetId);
      if (!record) {
        log(`[TWEET_RECORD] 更新通知状态失败: 未找到推文记录 ${tweetId}`, 'error');
        return false;
      }
      
      // 增加通知尝试次数
      record.notification_status.attempts += 1;
      record.notification_status.last_attempt_at = new Date().toISOString();
      
      // 更新通知渠道状态
      if (notificationResult) {
        record.notification_status.notified = true;
        if (notificationResult.email) {
          record.notification_status.channels.email = true;
        }
        if (notificationResult.feishu) {
          record.notification_status.channels.feishu = true;
        }
      }
      
      await redisClient.hset(TWEET_RECORDS_KEY, tweetId, JSON.stringify(record));
      log(`[TWEET_RECORD] 已更新推文通知状态: ${tweetId}, 通知${record.notification_status.notified ? '成功' : '失败'}`);
      
      return record.notification_status.notified;
    } catch (error) {
      log(`[TWEET_RECORD] 更新推文通知状态失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 添加待通知的推文
  async addPendingTweet(username, tweetId) {
    await this.ensureInitialized();
    
    try {
      // 获取当前待通知列表
      const pendingListKey = `${USER_PENDING_TWEETS_KEY}:${username}`;
      let pendingList = await redisClient.get(pendingListKey) || [];
      
      // 检查是否已在列表中
      if (!pendingList.includes(tweetId)) {
        pendingList.push(tweetId);
        await redisClient.set(pendingListKey, pendingList);
        log(`[TWEET_RECORD] 已添加待通知推文: ${username} -> ${tweetId}`);
      }
      
      return true;
    } catch (error) {
      log(`[TWEET_RECORD] 添加待通知推文失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 获取用户待通知的推文
  async getPendingTweets(username) {
    await this.ensureInitialized();
    
    try {
      const pendingListKey = `${USER_PENDING_TWEETS_KEY}:${username}`;
      const pendingList = await redisClient.get(pendingListKey) || [];
      
      // 获取所有待通知推文的完整记录
      const records = [];
      for (const tweetId of pendingList) {
        const record = await this.getTweetRecord(tweetId);
        if (record) {
          records.push(record);
        } else {
          // 如果找不到记录，从列表中移除
          await this.removePendingTweet(username, tweetId);
        }
      }
      
      log(`[TWEET_RECORD] 获取待通知推文: ${username} -> ${records.length}条`);
      return records;
    } catch (error) {
      log(`[TWEET_RECORD] 获取待通知推文失败: ${error.message}`, 'error');
      return [];
    }
  }

  // 从待通知列表中移除推文
  async removePendingTweet(username, tweetId) {
    await this.ensureInitialized();
    
    try {
      const pendingListKey = `${USER_PENDING_TWEETS_KEY}:${username}`;
      let pendingList = await redisClient.get(pendingListKey) || [];
      
      // 移除指定ID
      pendingList = pendingList.filter(id => id !== tweetId);
      await redisClient.set(pendingListKey, pendingList);
      
      log(`[TWEET_RECORD] 已从待通知列表移除: ${username} -> ${tweetId}`);
      return true;
    } catch (error) {
      log(`[TWEET_RECORD] 移除待通知推文失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 清除用户的所有待通知推文
  async clearPendingTweets(username) {
    await this.ensureInitialized();
    
    try {
      const pendingListKey = `${USER_PENDING_TWEETS_KEY}:${username}`;
      await redisClient.set(pendingListKey, []);
      
      log(`[TWEET_RECORD] 已清除用户所有待通知推文: ${username}`);
      return true;
    } catch (error) {
      log(`[TWEET_RECORD] 清除待通知推文失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 获取所有需要通知的推文
  // 包括：1) 新发现的推文，2) 之前通知失败的推文（重试次数未达上限）
  async getNotificationTweets(username, newTweetIds) {
    await this.ensureInitialized();
    
    try {
      // 获取当前所有待通知的推文
      const pendingTweets = await this.getPendingTweets(username);
      
      // 将新推文添加到待通知列表
      for (const tweetId of newTweetIds) {
        await this.addPendingTweet(username, tweetId);
      }
      
      // 过滤掉已经超过最大尝试次数的推文
      const eligibleTweets = pendingTweets.filter(tweet => 
        !tweet.notification_status.notified && 
        tweet.notification_status.attempts < MAX_NOTIFICATION_ATTEMPTS
      );
      
      // 区分新推文和旧推文（通知失败的）
      const newTweets = eligibleTweets.filter(tweet => newTweetIds.includes(tweet.tweet_id));
      const retryTweets = eligibleTweets.filter(tweet => !newTweetIds.includes(tweet.tweet_id));
      
      return {
        newTweets,
        retryTweets,
        allEligibleTweets: eligibleTweets
      };
    } catch (error) {
      log(`[TWEET_RECORD] 获取通知推文失败: ${error.message}`, 'error');
      return { newTweets: [], retryTweets: [], allEligibleTweets: [] };
    }
  }

  // 检查推文是否已经被处理过（有AI结果）
  async isTweetProcessed(tweetId) {
    await this.ensureInitialized();
    
    try {
      const record = await this.getTweetRecord(tweetId);
      if (!record) return false;
      
      return record.ai_processed && record.ai_processed.processed_at;
    } catch (error) {
      log(`[TWEET_RECORD] 检查推文处理状态失败: ${error.message}`, 'error');
      return false;
    }
  }
  
  // 处理通知结果
  async handleNotificationResult(username, notificationResult, tweetIds) {
    await this.ensureInitialized();
    
    try {
      let allSuccess = true;
      
      for (const tweetId of tweetIds) {
        // 更新每条推文的通知状态
        const success = await this.updateTweetNotificationStatus(tweetId, notificationResult);
        
        // 如果通知成功，从待通知列表中移除
        if (success) {
          await this.removePendingTweet(username, tweetId);
        } else {
          allSuccess = false;
          
          // 检查是否达到最大尝试次数
          const record = await this.getTweetRecord(tweetId);
          if (record && record.notification_status.attempts >= MAX_NOTIFICATION_ATTEMPTS) {
            log(`[TWEET_RECORD] 推文 ${tweetId} 达到最大通知尝试次数，从待通知列表移除`, 'warn');
            await this.removePendingTweet(username, tweetId);
          }
        }
      }
      
      return allSuccess;
    } catch (error) {
      log(`[TWEET_RECORD] 处理通知结果失败: ${error.message}`, 'error');
      return false;
    }
  }
}

module.exports = new TweetRecordService(); 