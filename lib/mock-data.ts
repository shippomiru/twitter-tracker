import { Tweet, NotificationLog, UserSettings } from "./types";

export const mockTweets: Tweet[] = [
  {
    id: "1",
    text: "Just launched our new AI-powered feature! Check it out at https://example.com/ai",
    createdAt: "2023-05-13T14:23:00Z",
    author: {
      username: "techcompany",
      name: "Tech Company",
      profileImageUrl: ""
    },
    translation: "刚刚发布了我们的新AI功能！快来 https://example.com/ai 看看吧"
  },
  {
    id: "2",
    text: "Exciting news: We're expanding our team! Looking for talented developers to join us.",
    createdAt: "2023-05-12T09:15:00Z",
    author: {
      username: "startup",
      name: "Startup Company",
      profileImageUrl: ""
    },
    translation: "激动人心的消息：我们正在扩大团队！寻找有才华的开发人员加入我们。"
  },
  {
    id: "3",
    text: "Our latest research paper on machine learning has been published! Read more at https://example.com/research",
    createdAt: "2023-05-11T16:45:00Z",
    author: {
      username: "researchlab",
      name: "Research Lab",
      profileImageUrl: ""
    },
    translation: "我们最新的机器学习研究论文已发表！在 https://example.com/research 阅读更多内容"
  },
  {
    id: "4",
    text: "Join us for our upcoming webinar on AI trends and developments. Register now!",
    createdAt: "2023-05-10T11:30:00Z",
    author: {
      username: "aievents",
      name: "AI Events",
      profileImageUrl: ""
    },
    translation: "加入我们即将举行的AI趋势和发展网络研讨会。立即注册！"
  }
];

export const mockNotificationLogs: NotificationLog[] = [];

export const mockSettings: UserSettings = {
  monitoredAccounts: [],
  emailAddress: "",
  phoneNumber: "",
  checkFrequency: 15,
  notificationChannels: {
    email: false,
    phone: false
  }
};