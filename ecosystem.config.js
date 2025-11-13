module.exports = {
    apps: [
      {
        name      : 'tracking',
        cwd       : '/var/www/html/tracking',
        script    : 'bun',
        args      : ['run', 'start', '-p', '3666'],
        env: {
          NODE_ENV: 'production',
          PORT: '3666'
        },
        env_file  : '.env',
        watch     : false
      }
    ]
  }
