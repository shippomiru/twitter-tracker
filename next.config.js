/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除静态导出配置，启用服务器功能
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 修改images配置，以支持服务器渲染
  images: { 
    domains: ['unavatar.io'],
  },
  // 启用详细日志
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

module.exports = nextConfig;
