module.exports = {
  apps: [
    {
      name: 'import-xlsx-tranout-dev',
      script: 'npm',
      args: 'run dev',
      interpreter: 'none',
      shell: true,
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
