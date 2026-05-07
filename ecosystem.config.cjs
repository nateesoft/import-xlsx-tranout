module.exports = {
  apps: [
    {
      name: 'import-xlsx-tranout',
      script: 'server.js',
      cwd: __dirname,
      watch: false,
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    },
    {
      name: 'import-xlsx-tranout-dev',
      script: 'cmd',
      args: '/c npm run dev',
      watch: false,
    },
  ],
}
