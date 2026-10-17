// PM2 config: keeps the app running 24/7 and restarts it after a crash
module.exports = {
  apps: [{
    name: "harsham-invoice",
    script: "server.js",
    env: { NODE_ENV: "production" }
  }]
};
