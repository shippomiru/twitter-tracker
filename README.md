# TweetWatcher

TweetWatcher是一个基于Next.js开发的Twitter/X监控应用，用于实时监控指定Twitter账号的新推文，并提供自动翻译和多渠道通知功能。

## 功能特点

- **推文监控**：追踪多个Twitter账号的最新动态
- **自动翻译**：英文推文自动翻译成中文，支持双语阅读
- **多渠道通知**：
  - 邮件通知：当监控的账号发布新推文时发送邮件
  - 电话通知：当有重要推文时发起电话提醒
- **通知日志**：记录所有通知的发送历史及状态
- **自定义设置**：灵活配置监控账号、通知频率和方式

## 技术栈

- **前端框架**：Next.js 13.5.1
- **UI组件**：shadcn/ui (基于Radix UI)
- **样式**：Tailwind CSS
- **语言**：TypeScript
- **状态管理**：React Hooks
- **表单处理**：React Hook Form + Zod

## 项目结构

```
project/
├── app/                      # Next.js应用路由
│   ├── api/                  # API路由
│   │   ├── logs/             # 通知日志API
│   │   ├── monitor/          # 监控推文API
│   │   └── settings/         # 用户设置API
│   ├── logs/                 # 日志页面
│   ├── pricing/              # 价格页面
│   ├── settings/             # 设置页面
│   ├── globals.css           # 全局样式
│   ├── layout.tsx            # 应用布局
│   └── page.tsx              # 首页
├── components/               # UI组件
│   ├── ui/                   # 基础UI组件
│   ├── hero-section.tsx      # 首页hero区域
│   ├── logs-table.tsx        # 日志表格
│   ├── main-nav.tsx          # 主导航
│   ├── pricing-cards.tsx     # 价格卡片
│   ├── settings-form.tsx     # 设置表单
│   ├── theme-provider.tsx    # 主题提供器
│   ├── theme-toggle.tsx      # 主题切换按钮
│   ├── tweet-card.tsx        # 推文卡片组件
│   └── tweet-feed.tsx        # 推文流组件
├── hooks/                    # 自定义Hooks
├── lib/                      # 工具函数和类型
│   ├── api-clients.ts        # API客户端接口
│   ├── mock-data.ts          # 模拟数据
│   ├── types.ts              # 类型定义
│   └── utils.ts              # 通用工具函数
├── .eslintrc.json            # ESLint配置
├── .gitignore                # Git忽略文件
├── components.json           # 组件配置
├── next.config.js            # Next.js配置
├── package.json              # 依赖管理
├── postcss.config.js         # PostCSS配置
├── tailwind.config.ts        # Tailwind配置
└── tsconfig.json             # TypeScript配置
```

## 数据流

1. **监控流程**：
   - 系统定期访问`/api/monitor`端点检查指定Twitter账号
   - 发现新推文后，使用翻译API将内容翻译成中文
   - 根据用户设置通过邮件或电话发送通知
   - 更新监控状态和日志记录

2. **用户设置**：
   - 用户在设置页面管理监控账号和通知首选项
   - 设置通过`/api/settings`端点保存

3. **通知日志**：
   - 系统记录所有通知的发送状态
   - 日志通过`/api/logs`端点获取并显示

## 外部API集成

应用设计为集成以下外部服务：

- **Twitter API**：获取推文和用户信息
- **翻译API**（DeepSeek）：进行英文到中文的翻译
- **邮件API**（Resend）：发送邮件通知
- **电话API**（飞书）：发送电话通知

## 开发运行

```bash
# 安装依赖
npm install

# 开发环境运行
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 未来计划

- 支持更多社交媒体平台监控
- 添加关键词过滤功能

## 许可证

[MIT](LICENSE) 