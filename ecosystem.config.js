module.exports = {
    apps: [
        {
            name: 'kitty-backend',
            script: 'dist/main.js',
            instances: 2, // Use 2 instances instead of 'max' for WebSocket stability
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'development',
                PORT: 3000
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            // Restart policy
            autorestart: true,
            watch: false,
            max_memory_restart: '512M', // Restart if memory exceeds 512MB

            // Logging
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm Z',

            // Advanced PM2 features
            min_uptime: '10s',
            max_restarts: 10,
            restart_delay: 4000,

            // Health monitoring
            kill_timeout: 5000,
            listen_timeout: 8000,

            // Environment variables for clustering
            node_args: '--max-old-space-size=2048',

            // Graceful shutdown
            wait_ready: true,

            // Instance variables
            instance_var: 'INSTANCE_ID',

            // Merge logs from all instances
            merge_logs: true,

            // Time zone
            time: true,

            // Handle uncaught exceptions gracefully
            ignore_watch: ['node_modules', 'logs'],

            // Error handling
            max_restarts: 10,
            restart_delay: 4000,

            // Prevent memory leaks
            max_memory_restart: '1G',

            // Health checks
            health_check_grace_period: 3000,

            // Ensure proper shutdown
            shutdown_with_message: true
        }
    ],

    // Deployment configuration (optional)
    deploy: {
        production: {
            user: 'node',
            host: 'your-server-ip',
            ref: 'origin/main',
            repo: 'git@github.com:Creativecop/kitty_backend.git',
            path: '/var/www/production',
            'pre-deploy-local': '',
            'post-deploy':
                'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
            'pre-setup': ''
        }
    }
}
