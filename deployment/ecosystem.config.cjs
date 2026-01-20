module.exports = {
  apps: [{
    name: 'puurga-backend',
    script: './backend/dist/server.js',
    cwd: '/var/www/Puurga',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3005,
      SUPABASE_URL: 'https://vhvxfnxtyrgiydztsonz.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodnhmbnh0eXJnaXlkenRzb256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MzY3ODgsImV4cCI6MjA2NTUxMjc4OH0.PSBNvMxqROqN4obepDH3ISrROQ9LfElk1FIqDzIpXU8',
      SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodnhmbnh0eXJnaXlkenRzb256Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTkzNjc4OCwiZXhwIjoyMDY1NTEyNzg4fQ.9k4FMJjQLV0GRcuuo2Y1UnzzLEPQ7iLkzOzseXgDoIk'
    },
    error_file: '/var/www/Puurga/logs/pm2-error.log',
    out_file: '/var/www/Puurga/logs/pm2-out.log',
    log_file: '/var/www/Puurga/logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
