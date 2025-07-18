<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a8/NestJS.svg" width="200" alt="Nest Logo" />
</p>

## Update Packages

We are gonna install an `npm` package globally for updating our `package.json` file with the latest version of used package in the starter kit. Install a package called <a href="https://www.npmjs.com/package/npm-check-updates" target="blank">`npm-check-updates`</a>

```bash
npm install -g npm-check-updates
```

Then run the inspector that will inspect the package versions.

```bash
ncu -u
```

Now you will see the package.json file has been updated with the latest package versions.

## Creating Environment

Before running the application, you have to make an `.env` file using the given `.env.example` file.

## Installing Dependencies

```bash
yarn
```

## Running the app

```bash
# Run development
yarn start

# watch mode
yarn start:dev

# production mode
npm run start:prod
```

## Seed Superadmin data

```bash
yarn seed:run
```

## PM2 Cluster Mode

This application is configured to run with PM2 in cluster mode for production environments. PM2 provides advanced process management features including load balancing, auto-restart, and monitoring.

### Installation

First, install PM2 globally (if not already installed):

```bash
npm install -g pm2
```

Then install the PM2 dependency for the project:

```bash
npm install
```

### Build the application

Before running with PM2, build the application:

```bash
npm run build
```

### PM2 Commands

```bash
# Start the application in cluster mode (development)
npm run pm2:start

# Start the application in cluster mode (production)
npm run pm2:start:prod

# Stop the application
npm run pm2:stop

# Restart the application (hard restart)
npm run pm2:restart

# Reload the application (graceful restart)
npm run pm2:reload

# Delete the application from PM2
npm run pm2:delete

# View logs
npm run pm2:logs

# View status
npm run pm2:status

# Monitor performance
npm run pm2:monitor
```

### Configuration

The PM2 configuration is defined in `ecosystem.config.js`:

- **Cluster Mode**: Uses all available CPU cores (`instances: 'max'`)
- **Auto Restart**: Automatically restarts on crashes
- **Memory Limit**: Restarts if memory usage exceeds 1GB
- **Logging**: Centralized logging to `./logs/` directory
- **Environment Variables**: Separate configs for development and production

### Monitoring

PM2 provides a built-in monitoring dashboard:

```bash
# Terminal-based monitoring
npm run pm2:monitor

# Web-based monitoring (PM2 Plus)
pm2 web
```

### Production Deployment

For production, use:

```bash
npm run build
npm run pm2:start:prod
```

This will start the application with production environment variables and optimized settings.

Now you can login to the starter kit with superadmin@example.com and 123456 as password.
