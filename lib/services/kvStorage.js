// 使用Upstash Redis或备用存储
const { Redis } = require('@upstash/redis');
const { log } = require('./utils');

// 创建Redis客户端
const getRedisClient = () => {
  // 优先使用Upstash Redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('[REDIS] 使用Upstash Redis连接');
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  
  // 如果没有配置，返回一个内存存储的模拟客户端
  console.warn('[REDIS] 未找到Redis配置，使用内存存储（仅用于开发环境）');
  return createMemoryMockClient();
};

// 创建一个基于内存的模拟客户端（开发环境使用）
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

// 获取Redis客户端实例
const redisClient = getRedisClient();

class KVStorageService {
  constructor() {
    this.USERS_KEY = 'monitored_users';
    this.TWEETS_KEY = 'user_tweets';
    this.SYSTEM_STATE_KEY = 'system_state';
    this.SYSTEM_SETTINGS_KEY = 'system_settings';
    
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
    
    // 系统设置初始化
    this.systemSettings = {
      emailAddress: '',
      phoneNumber: '',
      checkFrequency: 15,
      notificationChannels: {
        email: false,
        phone: false
      }
    };
    
    // 记录初始化日志
    log('KV存储服务初始化完成', 'info');
  }

  // 获取系统状态
  async getSystemState() {
    try {
      const state = await redisClient.get(this.SYSTEM_STATE_KEY);
      if (state) {
        this.systemState = state;
        return state;
      }
      return this.systemState;
    } catch (error) {
      log(`获取系统状态失败: ${error.message}`, 'error');
      return this.systemState;
    }
  }

  // 保存系统状态
  async saveSystemState(state) {
    try {
      this.systemState = { ...this.systemState, ...state };
      await redisClient.set(this.SYSTEM_STATE_KEY, this.systemState);
      log('系统状态已保存', 'info');
    } catch (error) {
      log(`保存系统状态失败: ${error.message}`, 'error');
    }
  }

  // 获取所有监控用户
  async getAllUsers() {
    try {
      const users = await redisClient.get(this.USERS_KEY);
      log(`获取所有监控用户: ${users ? Object.keys(users).length : 0} 个`);
      return users || {};
    } catch (error) {
      log(`获取所有监控用户失败: ${error.message}`, 'error');
      return {};
    }
  }

  // 获取单个监控用户
  async getUser(username) {
    try {
      const users = await this.getAllUsers();
      const user = users[username];
      log(`获取用户信息: ${username} -> ${user ? '成功' : '未找到'}`);
      return user;
    } catch (error) {
      log(`获取用户信息失败: ${error.message}`, 'error');
      return null;
    }
  }

  // 添加监控用户
  async addUser(username, userId) {
    try {
      const users = await this.getAllUsers();
      const userInfo = {
        userId,
        username,
        baselineTime: new Date().toISOString(),
        checkCount: 0
      };
      
      users[username] = userInfo;
      await redisClient.set(this.USERS_KEY, users);
      
      log(`添加监控用户: ${username} (${userId})`);
      log(`设置baseline时间: ${userInfo.baselineTime}`);
      log(`当前监控用户总数: ${Object.keys(users).length}`);
      
      return true;
    } catch (error) {
      log(`添加监控用户失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 清除所有用户
  async clearAllUsers() {
    try {
      const users = await this.getAllUsers();
      const userCount = Object.keys(users).length;
      const usernames = Object.keys(users);
      
      log(`[STORAGE] 清除所有用户数据，共 ${userCount} 个`);
      // 清空用户数据
      await redisClient.set(this.USERS_KEY, {});
      
      // 同时清空所有用户的推文数据
      await redisClient.set(this.TWEETS_KEY, {});
      
      // 重置系统设置
      const defaultSettings = {
        emailAddress: '',
        phoneNumber: '',
        checkFrequency: 15,
        notificationChannels: {
          email: false,
          phone: false
        }
      };
      await redisClient.set(this.SYSTEM_SETTINGS_KEY, defaultSettings);
      this.systemSettings = defaultSettings;
      
      log(`[STORAGE] 已清除用户: ${usernames.join(', ')}`);
      log(`[STORAGE] 已同时清除所有推文数据`);
      log(`[STORAGE] 已重置系统设置（邮箱、手机号等）`);
      return userCount;
    } catch (error) {
      log(`清除用户数据失败: ${error.message}`, 'error');
      return 0;
    }
  }

  // 初始化用户
  async initializeUser(username) {
    try {
      const users = await this.getAllUsers();
      if (!users[username]) {
        log(`创建新的监控用户: ${username}`, 'info');
        users[username] = {
          checkCount: 0,
          status: 'pending'
        };
        await redisClient.set(this.USERS_KEY, users);
      }
      return users[username];
    } catch (error) {
      log(`初始化用户失败: ${error.message}`, 'error');
      return null;
    }
  }

  // 设置用户基线时间
  async setUserBaseline(username, timestamp) {
    try {
      const users = await this.getAllUsers();
      if (users[username]) {
        users[username].baselineTime = timestamp;
        await redisClient.set(this.USERS_KEY, users);
        log(`设置baseline时间: ${timestamp}`, 'info');
      }
    } catch (error) {
      log(`设置用户基线时间失败: ${error.message}`, 'error');
    }
  }

  // 保存用户推文
  async saveUserTweets(username, tweets) {
    try {
      const tweetsData = await redisClient.get(this.TWEETS_KEY) || {};
      tweetsData[username] = tweets;
      await redisClient.set(this.TWEETS_KEY, tweetsData);
      
      log(`保存用户 ${username} 的最新推文: ${tweets.length} 条`);
      if (tweets.length > 0) {
        log(`最新推文ID: ${tweets[0].id}, 时间: ${tweets[0].created_at}`);
      }
    } catch (error) {
      log(`保存用户推文失败: ${error.message}`, 'error');
    }
  }

  // 获取用户推文
  async getUserTweets(username) {
    try {
      const tweetsData = await redisClient.get(this.TWEETS_KEY) || {};
      const tweets = tweetsData[username] || [];
      log(`获取用户 ${username} 的最新推文: ${tweets.length} 条`);
      return tweets;
    } catch (error) {
      log(`获取用户推文失败: ${error.message}`, 'error');
      return [];
    }
  }

  // 更新用户检查次数
  async incrementCheckCount(username) {
    try {
      const users = await this.getAllUsers();
      if (users[username]) {
        users[username].checkCount = (users[username].checkCount || 0) + 1;
        users[username].lastChecked = new Date().toISOString();
        await redisClient.set(this.USERS_KEY, users);
        log(`用户 ${username} 检查次数: ${users[username].checkCount}`);
      } else {
        log(`无法更新检查次数，用户 ${username} 未找到`, 'warn');
      }
    } catch (error) {
      log(`更新用户检查次数失败: ${error.message}`, 'error');
    }
  }

  // 检查新推文
  async checkNewTweets(username, tweets) {
    try {
      const user = await this.getUser(username);
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
    } catch (error) {
      log(`检查新推文失败: ${error.message}`, 'error');
      return [];
    }
  }

  // 保存系统设置
  async saveSystemSettings(settings) {
    try {
      this.systemSettings = { ...this.systemSettings, ...settings };
      await redisClient.set(this.SYSTEM_SETTINGS_KEY, this.systemSettings);
      log(`系统设置已保存，包含邮箱: ${settings.emailAddress ? '是' : '否'}, 手机号: ${settings.phoneNumber ? '是' : '否'}`, 'info');
      return true;
    } catch (error) {
      log(`保存系统设置失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 获取系统设置
  async getSystemSettings() {
    try {
      const settings = await redisClient.get(this.SYSTEM_SETTINGS_KEY);
      if (settings) {
        this.systemSettings = settings;
        log(`已加载系统设置，包含邮箱: ${settings.emailAddress ? '是' : '否'}, 手机号: ${settings.phoneNumber ? '是' : '否'}`, 'info');
        return settings;
      }
      log('未找到系统设置，使用默认值');
      return this.systemSettings;
    } catch (error) {
      log(`获取系统设置失败: ${error.message}`, 'error');
      return this.systemSettings;
    }
  }
}

module.exports = new KVStorageService(); 