/**
 * PM2 Ecosystem Configuration
 * 
 * Usage:
 *   pm2 start server/ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'flowscale-api',
      script: './server/api.js',
      cwd: '/var/www/flowscale',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        OUTPUT_DIR: '/var/www/flowscale/outputs',
      },
      error_file: '/var/log/pm2/flowscale-error.log',
      out_file: '/var/log/pm2/flowscale-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
