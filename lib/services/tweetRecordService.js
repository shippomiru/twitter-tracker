const { log } = require('./utils');
const { Redis } = require('@upstash/redis');

// Redis键名前缀
const TWEET_RECORD_PREFIX = 'tweet_record';         // 存储单条推文记录的前缀
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
    del: async (key) => {
      delete store[key];
      return 1;
    }
  };
};

// Redis客户端实例
const redisClient = getRedisClient();

// 生成推文记录的键名
const getTweetRecordKey = (tweetId) => `${TWEET_RECORD_PREFIX}:${tweetId}`;

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

  // 获取推文记录
  async getTweetRecord(tweetId) {
    await this.ensureInitialized();
    
    try {
      const recordKey = getTweetRecordKey(tweetId);
      const recordJson = await redisClient.get(recordKey);
      
      if (!recordJson) {
        return null;
      }
      
      // 增强安全检查，确保收到的是有效的JSON数据
      if (typeof recordJson === 'object' && recordJson !== null) {
        // 如果已经是对象，直接返回
        log(`[TWEET_RECORD] 获取记录 ${tweetId}: 收到对象类型数据`);
        return recordJson;
      } else if (typeof recordJson === 'string') {
        // 只尝试解析字符串
        try {
          const parsed = JSON.parse(recordJson);
          log(`[TWEET_RECORD] 获取记录 ${tweetId}: 成功解析JSON字符串`);
          return parsed;
        } catch (parseError) {
          log(`[TWEET_RECORD] JSON解析失败: ${parseError.message}, 收到的数据类型: ${typeof recordJson}, 值: ${String(recordJson).substring(0, 100)}`, 'error');
          return null;
        }
      } else {
        log(`[TWEET_RECORD] 收到的数据格式不正确: ${typeof recordJson}, 值: ${String(recordJson).substring(0, 50)}`, 'error');
        return null;
      }
    } catch (error) {
      log(`[TWEET_RECORD] 获取推文记录失败: ${error.message}`, 'error');
      return null;
    }
  }

  // 保存推文记录(安全版)
  async saveTweetRecordSafely(recordKey, record) {
    try {
      // 确保数据是字符串格式
      let dataToSave;
      
      if (typeof record === 'string') {
        // 验证是合法的JSON字符串
        try {
          JSON.parse(record);
          dataToSave = record;
        } catch (e) {
          log(`[TWEET_RECORD] 保存失败: 提供的字符串不是有效的JSON: ${e.message}`, 'error');
          return false;
        }
      } else if (typeof record === 'object' && record !== null) {
        // 对象序列化为JSON字符串
        try {
          dataToSave = JSON.stringify(record);
        } catch (e) {
          log(`[TWEET_RECORD] 序列化对象失败: ${e.message}`, 'error');
          return false;
        }
      } else {
        log(`[TWEET_RECORD] 保存失败: 无效的数据类型: ${typeof record}`, 'error');
        return false;
      }
      
      await redisClient.set(recordKey, dataToSave);
      return true;
    } catch (error) {
      log(`[TWEET_RECORD] 安全保存失败: ${error.message}`, 'error');
      return false;
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
      
      // 生成记录键名
      const recordKey = getTweetRecordKey(tweetData.id);
      
      // 使用安全保存方法
      const saveResult = await this.saveTweetRecordSafely(recordKey, record);
      if (saveResult) {
        log(`[TWEET_RECORD] 已保存推文记录: ${tweetData.id}`);
      } else {
        log(`[TWEET_RECORD] 推文记录保存操作失败: ${tweetData.id}`, 'error');
        return false;
      }
      
      // 验证记录是否保存成功
      const MAX_RETRY = 3;
      let retryCount = 0;
      let saved = false;
      
      while (retryCount < MAX_RETRY && !saved) {
        // 稍微延迟以确保Redis操作完成
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 检查记录是否存在
        const savedRecord = await this.getTweetRecord(tweetData.id);
        if (savedRecord) {
          saved = true;
          log(`[TWEET_RECORD] 已确认推文记录保存成功: ${tweetData.id}`);
        } else {
          retryCount++;
          log(`[TWEET_RECORD] 推文记录验证失败，重试 (${retryCount}/${MAX_RETRY}): ${tweetData.id}`, 'warn');
          // 再次尝试保存
          await this.saveTweetRecordSafely(recordKey, record);
        }
      }
      
      if (!saved) {
        log(`[TWEET_RECORD] 推文记录保存验证失败，已达最大重试次数: ${tweetData.id}`, 'error');
      }
      
      return saved;
    } catch (error) {
      log(`[TWEET_RECORD] 保存推文记录失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 更新推文的AI处理结果
  async updateTweetAIResults(tweetId, aiResults) {
    await this.ensureInitialized();
    
    try {
      // 获取推文记录
      let record = await this.getTweetRecord(tweetId);
      
      // 如果记录不存在，尝试重新创建一个基本记录
      if (!record) {
        log(`[TWEET_RECORD] 更新AI结果时未找到推文记录 ${tweetId}，尝试重新创建`, 'warn');
        
        // 创建基本记录
        record = {
          tweet_id: tweetId,
          username: 'unknown', // 将在下次完整数据可用时更新
          created_at: new Date().toISOString(),
          text: '',
          ai_processed: {
            summary: '',
            translation: '',
            is_ai_related: false,
            processed_at: null
          },
          notification_status: {
            notified: false,
            attempts: 0,
            last_attempt_at: null,
            channels: {
              email: false,
              feishu: false
            }
          }
        };
        
        // 保存基本记录
        const recordKey = getTweetRecordKey(tweetId);
        await this.saveTweetRecordSafely(recordKey, record);
        
        // 验证记录是否保存成功
        await new Promise(resolve => setTimeout(resolve, 100));
        record = await this.getTweetRecord(tweetId);
        
        if (!record) {
          log(`[TWEET_RECORD] 尝试重新创建记录失败: ${tweetId}`, 'error');
          return false;
        }
        
        log(`[TWEET_RECORD] 已成功创建基本记录: ${tweetId}`);
      }
      
      // 更新AI处理结果
      record.ai_processed = {
        summary: aiResults.summary || '',
        translation: aiResults.translation || '',
        is_ai_related: aiResults.is_ai_related || false,
        processed_at: new Date().toISOString()
      };
      
      // 保存更新后的记录
      const recordKey = getTweetRecordKey(tweetId);
      await this.saveTweetRecordSafely(recordKey, record);
      
      // 验证更新是否成功
      let updated = false;
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedRecord = await this.getTweetRecord(tweetId);
        
        if (updatedRecord && updatedRecord.ai_processed && updatedRecord.ai_processed.processed_at) {
          updated = true;
          break;
        }
        
        log(`[TWEET_RECORD] AI处理结果验证失败，重试 (${i+1}/3): ${tweetId}`, 'warn');
        await this.saveTweetRecordSafely(recordKey, record);
      }
      
      if (updated) {
        log(`[TWEET_RECORD] 已更新推文AI处理结果: ${tweetId}`);
        return true;
      } else {
        log(`[TWEET_RECORD] 更新AI处理结果验证失败: ${tweetId}`, 'error');
        return false;
      }
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
      let notified = false;
      if (notificationResult) {
        // 只有当至少有一个渠道通知成功时，才标记整体通知为成功
        if (notificationResult.email === true || notificationResult.feishu === true) {
          notified = true;
          record.notification_status.notified = true;
          
          // 更新各个渠道的状态
          if (notificationResult.email === true) {
            record.notification_status.channels.email = true;
          }
          if (notificationResult.feishu === true) {
            record.notification_status.channels.feishu = true;
          }
        } else {
          // 所有渠道通知失败，标记为未通知
          record.notification_status.notified = false;
          log(`[TWEET_RECORD] 所有通知渠道都失败，推文 ${tweetId} 标记为未通知`, 'warn');
        }
      } else {
        // notificationResult为空，表示通知失败
        record.notification_status.notified = false;
        log(`[TWEET_RECORD] 没有通知结果，推文 ${tweetId} 标记为未通知`, 'warn');
      }
      
      // 保存更新后的记录
      const recordKey = getTweetRecordKey(tweetId);
      await this.saveTweetRecordSafely(recordKey, record);
      
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

  // 判断推文是否符合通知条件
  async eligibleForNotification(tweet) {
    // 未通知过，尝试次数未超过上限，且翻译不为空
    return !tweet.notification_status.notified && 
           tweet.notification_status.attempts < MAX_NOTIFICATION_ATTEMPTS &&
           tweet.ai_processed && 
           tweet.ai_processed.translation && 
           tweet.ai_processed.translation.trim() !== "";
  }

  // 获取所有需要通知的推文
  // 包括：1) 新发现的推文，2) 之前通知失败的推文（重试次数未达上限）
  async getNotificationTweets(username, newTweetIds) {
    await this.ensureInitialized();
    
    try {
      // 记录起始状态
      log(`[TWEET_RECORD] 开始获取需要通知的推文 - 用户: ${username}, 新推文数: ${newTweetIds.length}`);
      
      // 获取当前所有待通知的推文
      const pendingTweets = await this.getPendingTweets(username);
      log(`[TWEET_RECORD] 当前待通知列表中有 ${pendingTweets.length} 条推文`);
      
      // 将新推文添加到待通知列表
      for (const tweetId of newTweetIds) {
        await this.addPendingTweet(username, tweetId);
      }
      
      // 重新获取待通知推文以确保包含新添加的推文
      const updatedPendingTweets = await this.getPendingTweets(username);
      log(`[TWEET_RECORD] 添加新推文后，待通知列表中有 ${updatedPendingTweets.length} 条推文`);
      
      // 过滤掉不符合通知条件的推文
      const eligibleTweets = [];
      const emptyTranslationTweets = [];
      
      // 筛选符合条件的推文
      for (const tweet of updatedPendingTweets) {
        if (await this.eligibleForNotification(tweet)) {
          eligibleTweets.push(tweet);
        } else if (!tweet.notification_status.notified && 
                  tweet.notification_status.attempts < MAX_NOTIFICATION_ATTEMPTS) {
          // 未通知且尝试次数未超过限制，但翻译为空
          emptyTranslationTweets.push(tweet);
        }
      }
      
      if (emptyTranslationTweets.length > 0) {
        log(`[TWEET_RECORD] 有 ${emptyTranslationTweets.length} 条推文因翻译为空而被过滤`, 'info');
        
        // 将翻译为空的推文从待通知列表中移除
        for (const tweet of emptyTranslationTweets) {
          log(`[TWEET_RECORD] 推文 ${tweet.tweet_id} 因翻译为空而被移除通知列表`);
          await this.removePendingTweet(username, tweet.tweet_id);
        }
      }
      
      log(`[TWEET_RECORD] 符合通知条件的推文: ${eligibleTweets.length} 条`);
      
      // 区分新推文和旧推文（通知失败的）
      const newTweets = eligibleTweets.filter(tweet => newTweetIds.includes(tweet.tweet_id));
      const retryTweets = eligibleTweets.filter(tweet => !newTweetIds.includes(tweet.tweet_id));
      
      log(`[TWEET_RECORD] 新推文: ${newTweets.length} 条, 重试推文: ${retryTweets.length} 条`);
      
      // 如果推文记录中找不到某些新推文ID（可能是因为保存失败），则尝试获取并添加
      const missingTweetIds = newTweetIds.filter(id => 
        !newTweets.some(tweet => tweet.tweet_id === id) &&
        !emptyTranslationTweets.some(tweet => tweet.tweet_id === id)
      );
      
      if (missingTweetIds.length > 0) {
        log(`[TWEET_RECORD] 发现 ${missingTweetIds.length} 条推文ID在记录中未找到，尝试重新处理`, 'warn');
        
        // 这里可以从kvStorage获取这些推文的原始数据，并重新保存
        // 由于此处无法直接访问原始推文数据，先警告记录
        
        // 将缺失的ID也添加到newTweetIds中，以便monitorService在下次循环中重试处理
        log(`[TWEET_RECORD] 这些推文将在下次检查时重新处理: ${missingTweetIds.join(', ')}`);
      }
      
      return {
        newTweets,
        retryTweets,
        allEligibleTweets: eligibleTweets,
        missingTweetIds
      };
    } catch (error) {
      log(`[TWEET_RECORD] 获取通知推文失败: ${error.message}`, 'error');
      return { 
        newTweets: [], 
        retryTweets: [], 
        allEligibleTweets: [],
        missingTweetIds: []
      };
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
      log(`[TWEET_RECORD] 处理通知结果 - 用户: ${username}, 推文数: ${tweetIds.length}, 通知结果: ${JSON.stringify(notificationResult)}`);
      
      // 检查通知结果是否为真正成功
      const hasSuccessfulChannel = notificationResult && 
        (notificationResult.email === true || notificationResult.feishu === true);
      
      for (const tweetId of tweetIds) {
        // 更新每条推文的通知状态
        const success = await this.updateTweetNotificationStatus(tweetId, notificationResult);
        
        // 如果通知成功，从待通知列表中移除
        if (success && hasSuccessfulChannel) {
          await this.removePendingTweet(username, tweetId);
          log(`[TWEET_RECORD] 通知成功，从待通知列表移除: ${tweetId}`);
        } else {
          allSuccess = false;
          log(`[TWEET_RECORD] 通知未成功完成，保留在待通知列表: ${tweetId}`, 'warn');
          
          // 检查是否达到最大尝试次数
          const record = await this.getTweetRecord(tweetId);
          if (record && record.notification_status.attempts >= MAX_NOTIFICATION_ATTEMPTS) {
            log(`[TWEET_RECORD] 推文 ${tweetId} 达到最大通知尝试次数，从待通知列表移除`, 'warn');
            await this.removePendingTweet(username, tweetId);
          }
        }
      }
      
      return hasSuccessfulChannel && allSuccess;
    } catch (error) {
      log(`[TWEET_RECORD] 处理通知结果失败: ${error.message}`, 'error');
      return false;
    }
  }
}

module.exports = new TweetRecordService(); 