module.exports = {
  apps: [
    {
      name: 'import-xlsx-tranout',
      script: '.next/standalone/server.js',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    }
  ]
}
