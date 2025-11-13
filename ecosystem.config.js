module.exports = {
    apps: [
      {
        name      : 'tracking',
        cwd       : '/home/tracking',
        script    : 'pnpm',
        interpreter: '/root/.nvm/versions/node/v20.19.5/bin/node',
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
