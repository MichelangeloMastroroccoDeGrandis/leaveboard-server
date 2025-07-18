module.exports = {
  apps: [
    {
      name: 'leaveboard-dev',
      script: './index.js',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 7088,
      },
    },
  ],
};
