module.exports = {
  apps: [
    {
      name: 'pmsy-api',
      script: './dist/index.js',
      instances: 'max', // 根据 CPU 核心数启动多个实例
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 日志配置
      log_file: '/var/log/pmsy/combined.log',
      out_file: '/var/log/pmsy/out.log',
      error_file: '/var/log/pmsy/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // 重启策略
      min_uptime: '10s',
      max_restarts: 5,
      // 内存限制
      max_memory_restart: '500M',
      // 监控
      watch: false,
      // 自动重启
      autorestart: true,
      // 优雅关闭
      kill_timeout: 5000,
      // 健康检查
      health_check_grace_period: 30000,
    },
  ],
};
