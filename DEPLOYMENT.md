# Deployment Guide

This guide covers deploying the Snapclass Rubrics application to production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Server Deployment](#server-deployment)
3. [Client Deployment](#client-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ installed on production server
- Access to Hugging Face API with valid token
- Ollama installed for embeddings (or alternative embedding service)
- Web server (Nginx/Apache) for serving Angular frontend
- SSL certificate (recommended for production)

---

## Server Deployment

### Option 1: Direct Node.js Deployment

1. **Prepare the server**:
   ```bash
   # Clone repository
   git clone <your-repo-url>
   cd snapclass-rubrics-generator/server
   ```

2. **Install dependencies**:
   ```bash
   npm install --production
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Set required variables:
   ```env
   HF_TOKEN=your_production_token
   NODE_ENV=production
   PORT=3001
   CORS_ORIGIN=https://yourdomain.com
   ```

4. **Add Snap! Manual**:
   ```bash
   # Copy SnapManual.pdf to server directory
   # This file is not in git due to size
   ```

5. **Start with PM2** (recommended for production):
   ```bash
   # Install PM2 globally
   npm install -g pm2
   
   # Start server
   pm2 start src/server.js --name snapclass-api
   
   # Setup auto-restart on reboot
   pm2 startup
   pm2 save
   ```

6. **Verify deployment**:
   ```bash
   curl http://localhost:3001/api/health
   ```

### Option 2: Using Process Manager

**PM2 Configuration** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'snapclass-api',
    script: 'src/server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
```

Start with:
```bash
pm2 start ecosystem.config.js
```

---

## Client Deployment

### Build for Production

1. **Navigate to client directory**:
   ```bash
   cd client
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Update environment for production**:
   Edit `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://api.yourdomain.com/api', // Your API URL
     apiTimeout: 60000,
   };
   ```

4. **Build**:
   ```bash
   npm run build
   # Output: dist/client-angular/
   ```

### Deploy to Nginx

1. **Copy build files**:
   ```bash
   sudo cp -r dist/client-angular/* /var/www/snapclass-rubrics/
   ```

2. **Configure Nginx** (`/etc/nginx/sites-available/snapclass`):
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       root /var/www/snapclass-rubrics;
       index index.html;
       
       # SPA routing - serve index.html for all routes
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Proxy API requests to backend
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           
           # Timeout for long AI requests
           proxy_read_timeout 120s;
           proxy_connect_timeout 120s;
       }
       
       # Compression
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
   }
   ```

3. **Enable site and reload Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/snapclass /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Setup SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

### Deploy to Apache

**Apache Configuration** (`.htaccess` in build directory):
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## Docker Deployment

### Server Dockerfile

Create `server/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY data/ ./data/

# Copy SnapManual.pdf (ensure it's in your repo or volume mount it)
COPY SnapManual.pdf ./

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "src/server.js"]
```

### Client Dockerfile

Create `client/Dockerfile`:
```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist/client-angular /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  api:
    build: ./server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - HF_TOKEN=${HF_TOKEN}
    volumes:
      - ./server/SnapManual.pdf:/app/SnapManual.pdf
    restart: unless-stopped
    
  client:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - api
    restart: unless-stopped
```

**Deploy**:
```bash
# Set environment variable
export HF_TOKEN=your_token_here

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Environment Configuration

### Production Environment Variables

**Server (`.env`)**:
```env
# Required
HF_TOKEN=your_production_huggingface_token
NODE_ENV=production

# Server
PORT=3001

# Security
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# AI Configuration
AI_MODEL=meta-llama/Llama-3.1-70B-Instruct
MAX_TOKENS=2048
TEMPERATURE=0.7

# RAG
DOC_PATH=SnapManual.pdf
CHUNK_SIZE=500
CHUNK_OVERLAP=50
SEARCH_RESULTS=5
```

**Client Environment**:
Update `src/environments/environment.ts` before building.

---

## Monitoring & Logging

### PM2 Monitoring

```bash
# View logs
pm2 logs snapclass-api

# Monitor resources
pm2 monit

# View status
pm2 status
```

### Setup Log Rotation

Create `/etc/logrotate.d/snapclass`:
```
/path/to/snapclass-rubrics-generator/server/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Troubleshooting

### Server Issues

1. **Port already in use**:
   ```bash
   sudo lsof -i :3001
   sudo kill -9 <PID>
   ```

2. **Vector store initialization fails**:
   - Verify `SnapManual.pdf` exists in server directory
   - Check Ollama is running: `ollama serve`
   - Check file permissions

3. **HF_TOKEN errors**:
   - Verify token is valid at https://huggingface.co/settings/tokens
   - Ensure `.env` file is loaded
   - Check token has proper permissions

### Client Issues

1. **API connection fails**:
   - Check CORS settings in server `.env`
   - Verify API URL in environment.ts
   - Check network/firewall rules

2. **Build fails**:
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Angular CLI version: `ng version`

3. **Routing doesn't work after deployment**:
   - Ensure server is configured for SPA routing
   - Check `.htaccess` or Nginx config

---

## Performance Optimization

1. **Enable Compression** (Nginx):
   Already included in config above

2. **CDN Integration**:
   - Consider serving static assets via CDN
   - Update `angular.json` deploy-url if needed

3. **API Caching**:
   - Implement Redis for caching frequently accessed rubrics
   - Cache vector store queries

4. **Scaling**:
   - Use PM2 cluster mode for multiple instances
   - Load balance with Nginx upstream
   - Consider horizontal scaling for high traffic

---

## Security Checklist

- [ ] Environment variables secured (not in git)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] CORS configured with specific origins (not *)
- [ ] API rate limiting implemented
- [ ] Regular dependency updates (`npm audit`)
- [ ] Firewall configured (only necessary ports open)
- [ ] Server access restricted (SSH keys only)
- [ ] Logs monitored for suspicious activity
- [ ] Backup strategy in place

---

## Maintenance

### Regular Updates

```bash
# Update dependencies
cd server && npm update
cd client && npm update

# Rebuild client
cd client && npm run build

# Restart server
pm2 restart snapclass-api
```

### Backup

```bash
# Backup environment configuration
cp server/.env server/.env.backup

# Backup generated rubrics (if persisted)
tar -czf rubrics-backup-$(date +%Y%m%d).tar.gz data/
```

---

---

## Quick Backend Deployment (Free Options)

### Current Status
- ✅ Frontend deployed: https://yashdive.github.io/snapclass-rubrics/
- ❌ Backend NOT deployed (API calls will fail)

### Option A: Render.com (Recommended)

1. Sign up at https://render.com with GitHub
2. New Web Service → Connect repo `yashdive/snapclass-rubrics`
3. Configure:
   - Root: `snapclass-rubrics-generator`
   - Build: `cd server && npm install`
   - Start: `cd server && npm start`
   - Add env vars: `NODE_ENV=production`, `HF_TOKEN=your_token`
4. Deploy and copy URL (e.g., `https://snapclass-api.onrender.com`)
5. Update `client/src/environments/environment.ts`:
   ```typescript
   apiUrl: 'https://your-render-url.onrender.com/api'
   ```
6. Rebuild frontend:
   ```bash
   cd client && npm run build:prod
   npx angular-cli-ghpages --dir=dist/client-angular/browser
   ```

### Option B: Railway.app

1. Sign up at https://railway.app
2. New Project → Deploy from GitHub
3. Select repo and configure root as `snapclass-rubrics-generator/server`
4. Add environment variables
5. Generate domain and update frontend (same as Render step 5-6)

---

## Support

For issues or questions:
- GitHub Issues: [Your Repo Issues URL]
- Documentation: [Your Docs URL]
- Email: [Your Support Email]

```
