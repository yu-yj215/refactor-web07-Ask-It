module.exports = {
  apps: [
    {
      name: 'http-server',
      script: 'pnpm',
      args: 'run start:prod:http',
      interpreter: 'none',
      cwd: './',
      env: {
        PORT: 3000,
      },
    },
  ],
};
