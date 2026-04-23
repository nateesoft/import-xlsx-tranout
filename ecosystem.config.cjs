module.exports = {
  apps: [
    {
      name: 'import-xlsx-tranout-dev',
      script: 'cmd',
      args: '/c npm run dev',
      watch: false,
    },
    {
      name: 'import-xlsx-tranout',
      script: 'node',
      args: '.next/standalone/server.js',
      watch: false,
    },
  ],
}
