module.exports = {
    apps: [
        {
            name: "flowscale-renderflow",
            script: "./server/renderflow/server.cjs",
            instances: 1,
            exec_mode: "fork",
            env: {
                NODE_ENV: "production",
                // PORT: 3001
            }
        }
    ]
};
