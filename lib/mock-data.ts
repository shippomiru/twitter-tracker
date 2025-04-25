import { Tweet, NotificationLog, UserSettings } from "./types";

export const mockTweets: Tweet[] = [
  {
    id: "1",
    text: "Just wrapped up our quarterly board meeting at OpenAI. Excited about the progress we're making with GPT-5 and our new research directions. Stay tuned for some big announcements next month!",
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 minutes ago
    author: {
      username: "sama",
      name: "Sam Altman",
      profileImageUrl: "https://pbs.twimg.com/profile_images/804990434455887872/BG0Xh7Oa_400x400.jpg"
    },
    translation: "刚刚结束了OpenAI的季度董事会会议。对我们在GPT-5和新研究方向上取得的进展感到兴奋。请关注下个月的一些重大公告！"
  },
  {
    id: "2",
    text: "The latest Grok AI update is live. We've improved the reasoning capabilities by 40% and added support for real-time data analysis. This is just the beginning of making AI truly useful for everyone.",
    createdAt: new Date(Date.now() - 7 * 60 * 1000).toISOString(), // 7 minutes ago
    author: {
      username: "elonmusk",
      name: "Elon Musk",
      profileImageUrl: "https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg"
    },
    translation: "最新的Grok AI更新已上线。我们将推理能力提高了40%，并添加了对实时数据分析的支持。这只是让AI真正对每个人有用的开始。"
  },
  {
    id: "3",
    text: "Breaking: We just released our new AI Safety research paper today. It demonstrates how we can build more robust guardrails for advanced AI systems. Download it now at openai.com/research/safety-2025",
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    author: {
      username: "sama",
      name: "Sam Altman",
      profileImageUrl: "https://pbs.twimg.com/profile_images/804990434455887872/BG0Xh7Oa_400x400.jpg"
    },
    translation: "重大消息：我们今天发布了新的AI安全研究论文。该论文展示了我们如何为高级AI系统构建更强大的安全guardrails。立即在openai.com/research/safety-2025下载"
  },
  {
    id: "4",
    text: "Just launched the new Tesla Optimus robot with enhanced AI capabilities. Now it can recognize and manipulate 1,500+ household objects with 95% accuracy. Production begins next quarter. Watch the demo: tesla.com/optimus-2025",
    createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    author: {
      username: "elonmusk",
      name: "Elon Musk",
      profileImageUrl: "https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg"
    },
    translation: "刚刚推出了具有增强AI功能的新款Tesla Optimus机器人。现在它可以识别和操作1,500多种家用物品，精度达95%。下季度开始生产。观看演示：tesla.com/optimus-2025"
  }
];

export const mockNotificationLogs: NotificationLog[] = [];

export const mockSettings: UserSettings = {
  monitoredAccounts: [],
  emailAddress: "",
  phoneNumber: "",
  checkFrequency: 30,
  notificationChannels: {
    email: false,
    phone: false
  }
};