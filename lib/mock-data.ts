import { Tweet, NotificationLog, UserSettings } from "./types";

export const mockTweets: Tweet[] = [
  {
    id: "1",
    text: "We're releasing GPT-4o — a new multimodal model that performs at the level of GPT-4 Turbo, while being much faster and 2x cheaper. It will be available to paid ChatGPT users today and all ChatGPT users over the coming weeks. Free API access as well. https://openai.com/gpt-4o",
    createdAt: "2023-05-13T14:23:00Z",
    author: {
      username: "sama",
      name: "Sam Altman",
      profileImageUrl: "https://pbs.twimg.com/profile_images/804990434455887872/BG0Xh7Oa_400x400.jpg"
    },
    translation: "我们正在发布 GPT-4o — 一个新的多模态模型，性能达到 GPT-4 Turbo 的水平，同时速度更快且价格降低 50%。它将从今天开始向付费 ChatGPT 用户提供，并在未来几周内向所有 ChatGPT 用户开放。同时还将提供免费的 API 访问。https://openai.com/gpt-4o"
  },
  {
    id: "2",
    text: "Falcon 9 launches 23 @Starlink satellites from Florida https://www.spacex.com",
    createdAt: "2023-05-12T18:45:00Z",
    author: {
      username: "elonmusk",
      name: "Elon Musk",
      profileImageUrl: "https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg"
    },
    translation: "猎鹰 9 号从佛罗里达发射了 23 颗 @Starlink 卫星 https://www.spacex.com"
  },
  {
    id: "3",
    text: "Claude 3.5 Sonnet is available today in Claude and the Anthropic API.\n\nIt's our most intelligent, fastest, and most cost-effective model yet. It's 50% cheaper than Claude 3 Opus, with Opus-level intelligence.\n\nMake smarter, more accurate decisions with Claude 3.5 Sonnet.",
    createdAt: "2023-05-11T10:12:00Z",
    author: {
      username: "DarioAmodei",
      name: "Dario Amodei",
      profileImageUrl: "https://pbs.twimg.com/profile_images/1554574970459811841/dHNJrwMp_400x400.jpg"
    },
    translation: "Claude 3.5 Sonnet 今天在 Claude 和 Anthropic API 中可用。\n\n这是我们迄今为止最智能、最快速且最具成本效益的模型。它比 Claude 3 Opus 便宜 50%，但拥有 Opus 级别的智能。\n\n使用 Claude 3.5 Sonnet 做出更智能、更准确的决策。"
  },
  {
    id: "4",
    text: "Announcing Gemini 1.5 Flash, our fastest and most cost-effective model yet.\n\nLarge context models have traditionally been slower and more expensive to use as context grows. Flash is optimized for conversational use cases, requiring less compute to read through long prompts.",
    createdAt: "2023-05-10T09:30:00Z",
    author: {
      username: "sundarpichai",
      name: "Sundar Pichai",
      profileImageUrl: "https://pbs.twimg.com/profile_images/864282616597405701/M-FEJMZ0_400x400.jpg"
    },
    translation: "宣布推出 Gemini 1.5 Flash，这是我们迄今为止最快速且最具成本效益的模型。\n\n传统上，大上下文模型随着上下文增长会变得更慢且使用成本更高。Flash 针对对话用例进行了优化，在阅读长提示时需要更少的计算资源。"
  }
];

export const mockNotificationLogs: NotificationLog[] = [
  {
    id: "1",
    timestamp: "2023-05-13T14:25:00Z",
    tweetId: "1",
    accountName: "sama",
    notificationType: "email",
    status: "success"
  },
  {
    id: "2",
    timestamp: "2023-05-13T14:25:30Z",
    tweetId: "1",
    accountName: "sama",
    notificationType: "phone",
    status: "success"
  },
  {
    id: "3",
    timestamp: "2023-05-12T18:47:00Z",
    tweetId: "2",
    accountName: "elonmusk",
    notificationType: "email",
    status: "success"
  },
  {
    id: "4",
    timestamp: "2023-05-12T18:47:20Z",
    tweetId: "2",
    accountName: "elonmusk",
    notificationType: "phone",
    status: "failed",
    errorMessage: "Failed to connect to phone service"
  },
  {
    id: "5",
    timestamp: "2023-05-11T10:15:00Z",
    tweetId: "3",
    accountName: "DarioAmodei",
    notificationType: "email",
    status: "success"
  }
];

export const mockSettings: UserSettings = {
  monitoredAccounts: [
    {
      username: "sama",
      name: "Sam Altman",
      lastChecked: "2023-05-13T14:20:00Z",
      lastTweetId: "1"
    },
    {
      username: "elonmusk",
      name: "Elon Musk",
      lastChecked: "2023-05-12T18:40:00Z",
      lastTweetId: "2"
    },
    {
      username: "DarioAmodei",
      name: "Dario Amodei",
      lastChecked: "2023-05-11T10:10:00Z",
      lastTweetId: "3"
    },
    {
      username: "sundarpichai",
      name: "Sundar Pichai",
      lastChecked: "2023-05-10T09:28:00Z",
      lastTweetId: "4"
    }
  ],
  checkFrequency: 15, // minutes
  notificationChannels: {
    email: true,
    phone: true
  },
  emailAddress: "user@example.com",
  phoneNumber: "+1234567890"
};