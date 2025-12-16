module.exports = {
    apps: [{
        name: "renderflow-engine",
        script: "./server/renderflow/server.ts",
        interpreter: "node",
        interpreter_args: "--import tsx",
        env: {
            NODE_ENV: "production",
            PORT: 3001
        },
        error_file: "./server/renderflow/logs/err.log",
        out_file: "./server/renderflow/logs/out.log",
        time: true
    }]
};
