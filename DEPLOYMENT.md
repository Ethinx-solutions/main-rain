# 🚀 Deployment Guide

This guide covers multiple deployment options for the Second Brain Dashboard.

## 🌐 Live Demo

**Demo URL**: [https://second-brain-demo.railway.app](https://second-brain-demo.railway.app)

**Demo Credentials**:
- Email: `demo@example.com`
- Password: `demo123`

## 📋 Pre-deployment Checklist

- [ ] MongoDB database ready (Atlas, local, or Docker)
- [ ] Environment variables configured
- [ ] Email service configured (optional)
- [ ] Domain name ready (optional)

## 🚀 Quick Deploy Options

### 1. Railway (Recommended - Free Tier Available)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

**Steps:**
1. Click the Railway button above
2. Connect your GitHub account
3. Set environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Random secure string
   - `EMAIL_*`: Email configuration (optional)
4. Deploy automatically

**Estimated time**: 5 minutes

### 2. Vercel + MongoDB Atlas

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/second-brain-dashboard)

**Steps:**
1. Click the Vercel button above
2. Connect GitHub and import repository
3. Set environment variables in Vercel dashboard
4. Deploy automatically

**Estimated time**: 10 minutes

### 3. Heroku

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/yourusername/second-brain-dashboard)

**Steps:**
1. Click the Heroku button above
2. Set app name and environment variables
3. Add MongoDB Atlas add-on or use external MongoDB
4. Deploy

**Estimated time**: 15 minutes

## 🐳 Docker Deployment

### Local Docker

```bash
# Clone repository
git clone https://github.com/yourusername/second-brain-dashboard.git
cd second-brain-dashboard

# Start with Docker Compose
docker-compose up -d

# Access at http://localhost:5000
```

### Docker Hub

```bash
# Pull and run
docker run -p 5000:5000 \
  -e MONGODB_URI=your-mongodb-uri \
  -e JWT_SECRET=your-secret \
  yourusername/second-brain:latest
```

## ☁️ Cloud Platform Guides

### Railway Deployment

1. **Create Railway Account**: [railway.app](https://railway.app)

2. **Deploy from GitHub**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway link
   railway up
   ```

3. **Set Environment Variables**:
   ```bash
   railway variables set MONGODB_URI=mongodb+srv://...
   railway variables set JWT_SECRET=your-secret-key
   ```

4. **Custom Domain** (optional):
   - Go to Railway dashboard
   - Settings → Domains
   - Add your custom domain

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Environment Variables**:
   - Go to Vercel dashboard
   - Project Settings → Environment Variables
   - Add required variables

### Netlify Deployment

1. **Build and Deploy**:
   ```bash
   # Install Netlify CLI
   npm i -g netlify-cli
   
   # Build client
   cd client && npm run build
   
   # Deploy
   netlify deploy --prod --dir=build
   ```

2. **Serverless Functions**:
   - Create `netlify/functions` directory
   - Move API routes to serverless functions

### DigitalOcean App Platform

1. **Create App**:
   - Go to DigitalOcean dashboard
   - Create App from GitHub repository

2. **Configure Build**:
   ```yaml
   name: second-brain
   services:
   - name: web
     source_dir: /
     github:
       repo: yourusername/second-brain-dashboard
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: MONGODB_URI
       value: your-mongodb-uri
     - key: JWT_SECRET
       value: your-secret
   ```

## 🗄️ Database Setup

### MongoDB Atlas (Recommended)

1. **Create Account**: [mongodb.com/atlas](https://www.mongodb.com/atlas)

2. **Create Cluster**:
   - Choose free tier (M0)
   - Select region closest to your users
   - Create cluster

3. **Setup Access**:
   - Database Access → Add user
   - Network Access → Add IP (0.0.0.0/0 for all)

4. **Get Connection String**:
   - Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your password

### Local MongoDB

```bash
# Install MongoDB
# macOS
brew install mongodb-community

# Ubuntu
sudo apt-get install mongodb

# Start MongoDB
mongod

# Connection string
MONGODB_URI=mongodb://localhost:27017/secondbrain
```

### Docker MongoDB

```bash
# Run MongoDB container
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:6.0

# Connection string
MONGODB_URI=mongodb://localhost:27017/secondbrain
```

## 📧 Email Configuration

### Gmail Setup

1. **Enable 2FA**: Google Account → Security → 2-Step Verification

2. **Generate App Password**:
   - Google Account → Security → App passwords
   - Select app: Mail
   - Select device: Other
   - Copy generated password

3. **Environment Variables**:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

### SendGrid Setup

1. **Create Account**: [sendgrid.com](https://sendgrid.com)

2. **Get API Key**:
   - Settings → API Keys
   - Create API Key

3. **Environment Variables**:
   ```env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASS=your-sendgrid-api-key
   ```

## 🔒 Security Configuration

### JWT Secret

Generate a secure JWT secret:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# OpenSSL
openssl rand -hex 64

# Online generator
# https://generate-secret.vercel.app/64
```

### Environment Variables

**Required**:
- `MONGODB_URI`: Database connection string
- `JWT_SECRET`: JWT signing secret (64+ characters)

**Optional**:
- `EMAIL_HOST`: SMTP host
- `EMAIL_PORT`: SMTP port (587 for TLS)
- `EMAIL_USER`: SMTP username
- `EMAIL_PASS`: SMTP password
- `CLIENT_URL`: Frontend URL (for CORS)
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (production/development)

## 🌍 Custom Domain Setup

### Cloudflare (Recommended)

1. **Add Domain to Cloudflare**
2. **Update Nameservers**
3. **Create DNS Records**:
   ```
   Type: CNAME
   Name: @
   Target: your-app.railway.app
   ```

### Domain Registrar

1. **Access DNS Settings**
2. **Add CNAME Record**:
   ```
   Host: @
   Points to: your-app.railway.app
   TTL: 300
   ```

## 📊 Monitoring & Analytics

### Railway Metrics

- Built-in metrics dashboard
- Resource usage monitoring
- Deployment logs

### Custom Monitoring

Add monitoring tools:

```javascript
// Add to server.js
const morgan = require('morgan');
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## 🔧 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**:
   - Check connection string
   - Verify network access
   - Ensure database user has permissions

2. **Build Failures**:
   - Check Node.js version (16+)
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

3. **Environment Variables Not Working**:
   - Verify variable names (case-sensitive)
   - Check for typos
   - Restart application after changes

4. **CORS Errors**:
   - Set `CLIENT_URL` environment variable
   - Check allowed origins in server.js

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG=app:*
```

### Logs

Check application logs:

```bash
# Railway
railway logs

# Vercel
vercel logs

# Heroku
heroku logs --tail

# Docker
docker logs container-name
```

## 📈 Performance Optimization

### Production Optimizations

1. **Enable Compression**:
   ```javascript
   app.use(compression());
   ```

2. **Set Cache Headers**:
   ```javascript
   app.use(express.static('client/build', {
     maxAge: '1y'
   }));
   ```

3. **Database Indexing**:
   ```javascript
   // Add to models
   schema.index({ userId: 1, createdAt: -1 });
   ```

### CDN Setup

Use CDN for static assets:

1. **Cloudflare**: Automatic CDN
2. **AWS CloudFront**: Manual setup
3. **Vercel**: Built-in CDN

## 🔄 CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: cd client && npm ci && npm run build
      - uses: railway-app/railway-deploy@v1
        with:
          railway-token: ${{ secrets.RAILWAY_TOKEN }}
```

## 📞 Support

If you encounter issues:

1. Check the [troubleshooting section](#-troubleshooting)
2. Search [GitHub Issues](https://github.com/yourusername/second-brain-dashboard/issues)
3. Create a new issue with:
   - Deployment platform
   - Error messages
   - Environment details

---

**Need help?** Join our [Discord community](https://discord.gg/your-invite) or [create an issue](https://github.com/yourusername/second-brain-dashboard/issues/new).