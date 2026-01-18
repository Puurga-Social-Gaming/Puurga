module.exports = {
  apps: [{
    name: 'puurga-backend',
    script: './dist/server.js',
    cwd: '/var/www/app/backend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3005
    },
    error_file: '/var/www/app/logs/pm2-error.log',
    out_file: '/var/www/app/logs/pm2-out.log',
    log_file: '/var/www/app/logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
