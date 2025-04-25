const { log } = require('./utils');
const { Redis } = require('@upstash/redis');

// Redis键名
const TWITTER_USER_CACHE_KEY = 'twitter_user_id_cache';

// 获取Redis客户端
const getRedisClient = () => {
  // 优先使用Upstash Redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('[TWITTER_CACHE] 使用Upstash Redis连接');
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  
  // 如果没有配置，返回一个内存存储的模拟客户端
  console.warn('[TWITTER_CACHE] 未找到Redis配置，使用内存存储（仅用于开发环境）');
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

/**
 * Twitter用户缓存服务
 * 持久化存储Twitter用户名和用户ID的映射关系
 * 这个缓存不受用户设置变更的影响
 */
class TwitterUserCache {
  constructor() {
    this.initialized = false;
    this.cache = {};
    this.init();
  }

  // 初始化缓存
  async init() {
    try {
      const cachedData = await redisClient.get(TWITTER_USER_CACHE_KEY);
      if (cachedData) {
        this.cache = cachedData;
        log(`[TWITTER_CACHE] 已加载${Object.keys(this.cache).length}个Twitter用户ID缓存`);
      } else {
        this.cache = {};
        // 初始化缓存
        await redisClient.set(TWITTER_USER_CACHE_KEY, this.cache);
        log('[TWITTER_CACHE] 初始化Twitter用户ID缓存');
      }
      this.initialized = true;
    } catch (error) {
      log(`[TWITTER_CACHE] 初始化缓存失败: ${error.message}`, 'error');
      this.cache = {};
      this.initialized = true; // 仍然标记为初始化完成，使用内存缓存
    }
  }

  // 确保初始化完成
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  // 获取用户ID
  async getUserId(username) {
    await this.ensureInitialized();
    
    const normalizedUsername = username.toLowerCase();
    const userId = this.cache[normalizedUsername];
    
    if (userId) {
      log(`[TWITTER_CACHE] 缓存命中: ${normalizedUsername} -> ${userId}`);
    } else {
      log(`[TWITTER_CACHE] 缓存未命中: ${normalizedUsername}`);
    }
    
    return userId;
  }

  // 保存用户ID
  async saveUserId(username, userId) {
    if (!username || !userId) {
      log('[TWITTER_CACHE] 保存失败: 用户名或ID为空', 'warn');
      return false;
    }
    
    await this.ensureInitialized();
    
    const normalizedUsername = username.toLowerCase();
    this.cache[normalizedUsername] = userId;
    
    try {
      await redisClient.set(TWITTER_USER_CACHE_KEY, this.cache);
      log(`[TWITTER_CACHE] 已缓存: ${normalizedUsername} -> ${userId}`);
      return true;
    } catch (error) {
      log(`[TWITTER_CACHE] 保存缓存失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 获取缓存统计信息
  async getStats() {
    await this.ensureInitialized();
    const count = Object.keys(this.cache).length;
    return {
      count,
      usernames: Object.keys(this.cache)
    };
  }

  // 清除指定用户的缓存
  async clearUser(username) {
    await this.ensureInitialized();
    
    const normalizedUsername = username.toLowerCase();
    if (this.cache[normalizedUsername]) {
      delete this.cache[normalizedUsername];
      
      try {
        await redisClient.set(TWITTER_USER_CACHE_KEY, this.cache);
        log(`[TWITTER_CACHE] 已清除用户缓存: ${normalizedUsername}`);
        return true;
      } catch (error) {
        log(`[TWITTER_CACHE] 清除用户缓存失败: ${error.message}`, 'error');
        return false;
      }
    }
    
    return false;
  }
}

module.exports = new TwitterUserCache(); 