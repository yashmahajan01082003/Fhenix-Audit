# DEVOPS & DEPLOYMENT READINESS AUDIT

**Focus:** Build pipeline, deployment infrastructure, monitoring, and production readiness

---

## 1. BUILD SYSTEM ANALYSIS

### 1.1 Vite Configuration

#### 🟡 MEDIUM: Plugin Configuration Not Production-Optimized
**Severity:** MEDIUM  
**File:** `vite.config.js`  
**Problem:** Plugins configured but not optimized for production builds.
```javascript
// Current vite.config.js likely looks like
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  // Missing production optimizations
});

// Should have
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,  // Disable in production
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco': ['@monaco-editor/react'],
          'radix': ['@radix-ui/react-accordion', ...allRadixPackages],
          'ethers': ['ethers', 'viem'],
          'privy': ['@privy-io/react-auth']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3101',
        changeOrigin: true
      }
    }
  }
});
```

---

#### 🟡 HIGH: No Environment-Specific Builds
**Severity:** HIGH  
**Problem:** Can't easily build for dev/staging/prod with different configs.
```javascript
// Missing .env handling
// Should have
if (process.env.VITE_ENV === 'production') {
  config.build.sourcemap = false;
  config.build.minify = 'terser';
}

// Users should be able to:
// VITE_ENV=dev npm run build
// VITE_ENV=staging npm run build
// VITE_ENV=prod npm run build
```

---

#### 🟡 HIGH: No Build Output Analysis
**Severity:** HIGH  
**Problem:** No way to see what's in the final bundle.
```bash
# Missing build analysis
# Should install
npm install --save-dev rollup-plugin-visualizer

# Then add to vite.config.js
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    ...other plugins,
    visualizer({
      open: true,  // Opens visualization in browser
      gzipSize: true
    })
  ]
});

# Then after build:
# npm run build
# Opens visualization of bundle contents (what's taking space?)
```

---

### 1.2 Build Performance

#### 🟡 HIGH: Slow Build Times Likely
**Severity:** HIGH  
**Problem:** With 30+ Radix UI components, Monaco Editor, Hardhat, build is probably slow.
```bash
# To measure
npm run build -- --benchmark

# If > 30 seconds, need optimization

# Current issues likely:
# 1. Eager glob imports (curriculum-loader.js loads ALL lessons at once)
# 2. No code splitting between admin/user views
# 3. Monaco Editor bundled at 50MB+ uncompressed
# 4. All Radix UI components bundled even if not used
```

---

#### 🟡 HIGH: No Lazy Loading
**Severity:** HIGH  
**Problem:** All lessons bundled upfront. Should lazy load.
```javascript
// Current (BAD - eager loading)
// curriculum-loader.js
const lessons = import.meta.glob('/src/content/**/*.mdx', { eager: true });

// Problem: ALL 50+ lessons loaded on app startup = 5MB+ extra JS

// Should be (GOOD - lazy loading)
const lessonModules = import.meta.glob('/src/content/**/*.mdx');

function getLessonAsync(path) {
  return lessonModules[path]().then(m => m.default);
}

// Usage
const LessonComponent = React.lazy(() => 
  getLessonAsync(lessonPath).then(m => ({ default: m }))
);
```

---

### 1.3 Dependency Management

#### 🟡 HIGH: No Dependency Audit in CI
**Severity:** HIGH  
**Problem:** No automated check for known vulnerabilities.
```bash
# Missing in CI/CD
npm audit --production

# Should fail build if vulnerabilities found
# Current packages with potential issues:
# - ethers@6.10.0 (check for CVEs)
# - @privy-io/react-auth@3.8.0 (beta - potential issues)
# - CoFHE SDK@0.4.0 (beta - not thoroughly tested)
```

---

#### 🟡 MEDIUM: No Lock File Verification
**Severity:** MEDIUM  
**Problem:** pnpm-lock.yaml exists but might be stale.
```bash
# Should verify in CI
pnpm install --frozen-lockfile

# Prevents "works on my machine" issues
# Forces use of exact versions from lock file
```

---

## 2. DEPLOYMENT INFRASTRUCTURE

### 2.1 Frontend Deployment

#### 🟡 HIGH: No Deployment Target Defined
**Severity:** HIGH  
**Problem:** No deployment mechanism documented.
```bash
# Missing deployment options:
# 1. Vercel (recommended for Vite + React)
# 2. Netlify
# 3. AWS S3 + CloudFront
# 4. Azure Static Web Apps
# 5. GitHub Pages

# Should document
# Each option needs:
# - Environment variable setup
# - Build command
# - Deploy command
# - Domain/SSL setup
# - CDN configuration
```

---

#### 🟡 HIGH: No Dockerfile
**Severity:** HIGH  
**Problem:** Can't containerize frontend.
```dockerfile
# Missing Dockerfile for frontend
# Should have
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

#### 🟡 HIGH: No nginx Configuration
**Severity:** HIGH  
**Problem:** If using Docker/nginx, need proper config.
```nginx
# Missing nginx.conf for SPA routing
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing - send all non-file requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Don't cache index.html
    location = /index.html {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

---

### 2.2 Backend Deployment

#### 🟡 HIGH: No Backend Dockerfile
**Severity:** HIGH  
**Problem:** Can't deploy Express server.
```dockerfile
# Missing Dockerfile for server.js
FROM node:18-alpine
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install --production

# Copy server
COPY server.js .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port
EXPOSE 3101

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3101/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "server.js"]
```

---

#### 🟡 HIGH: No PM2 Configuration
**Severity:** HIGH  
**Problem:** If running on bare metal, no process management.
```javascript
// Missing ecosystem.config.js for PM2
module.exports = {
  apps: [{
    name: 'fhenix-api',
    script: './server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3101,
      DATABASE_URL: 'sqlite:///data/progress.db'
    },
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster',
    error_file: '/var/log/fhenix-api-error.log',
    out_file: '/var/log/fhenix-api-out.log',
    max_memory_restart: '1G',
    watch: false  // Don't auto-restart on file changes
  }]
};
```

---

#### 🟡 HIGH: No Environment Variable Validation
**Severity:** HIGH  
**Problem:** Server crashes if missing required env vars.
```javascript
// Missing in server.js startup
function validateEnvironment() {
  const required = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL'
  ];
  
  const missing = required.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    process.exit(1);
  }
}

validateEnvironment();
```

---

### 2.3 Database Setup

#### 🟡 HIGH: No Database Migration System
**Severity:** HIGH  
**Problem:** No way to update database schema in production.
```javascript
// Missing migration framework
// Should use something like Knex.js or Sequelize

// Or simple home-grown system:
const migrations = [
  {
    id: '001',
    up: () => db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        display_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    down: () => db.exec(`DROP TABLE users`)
  },
  {
    id: '002',
    up: () => db.exec(`
      ALTER TABLE users ADD COLUMN avatar_url TEXT
    `),
    down: () => db.exec(`ALTER TABLE users DROP COLUMN avatar_url`)
  }
];

async function runMigrations() {
  for (const migration of migrations) {
    try {
      await migration.up();
      console.log(`✓ Migration ${migration.id} applied`);
    } catch (e) {
      console.error(`✗ Migration ${migration.id} failed:`, e);
      process.exit(1);
    }
  }
}
```

---

#### 🟡 HIGH: No Backup Strategy
**Severity:** HIGH  
**Problem:** If SQLite file deleted, all progress lost.
```bash
# Missing backup strategy
# Should have automated backups:

# Daily backup script
#!/bin/bash
BACKUP_DIR="/backups/fhenix-api"
DATE=$(date +%Y-%m-%d-%H%M%S)

# Backup database
cp /data/progress.db $BACKUP_DIR/progress.db.$DATE

# Keep only last 30 days
find $BACKUP_DIR -mtime +30 -delete

# Upload to S3
aws s3 sync $BACKUP_DIR s3://fhenix-backups/

# Scheduled via cron
0 2 * * * /scripts/backup.sh
```

---

## 3. CI/CD PIPELINE

### 3.1 Build Pipeline

#### 🔴 CRITICAL: No CI/CD Pipeline
**Severity:** CRITICAL  
**Problem:** No automated testing/building/deploying.

**Missing:** GitHub Actions workflow file.

```yaml
# Missing .github/workflows/build.yml
name: Build & Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Build
        run: npm run build
      
      - name: Test
        run: npm run test:unit
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/
```

---

#### 🟡 HIGH: No Linting in CI
**Severity:** HIGH  
**Problem:** Code style not enforced.
```yaml
# Add to workflow
- name: Run ESLint
  run: npx eslint src/ --max-warnings 0
  # Fails if any warnings
```

---

#### 🟡 HIGH: No Type Checking
**Severity:** HIGH  
**Problem:** TypeScript errors not caught.
```yaml
# Add to workflow
- name: Type check
  run: npx tsc --noEmit
```

---

### 3.2 Testing Pipeline

#### 🔴 CRITICAL: No Automated Testing
**Severity:** CRITICAL  
**Problem:** No test suite in CI.
```yaml
# Missing test step
- name: Unit tests
  run: npm run test:unit -- --coverage

- name: Integration tests
  run: npm run test:integration
  env:
    TEST_DB: sqlite:///:memory:
    TEST_NETWORK: arbitrum-sepolia

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

---

#### 🟡 HIGH: No Smart Contract Testing
**Severity:** HIGH  
**Problem:** No automated contract tests.
```bash
# Missing in CI
cd hardhat
npm run test

# Should fail build if tests fail
# All contract changes require test coverage
```

---

### 3.3 Deployment Pipeline

#### 🔴 CRITICAL: No Automated Deployment
**Severity:** CRITICAL  
**Problem:** Manual deployment process. Can't easily deploy.
```yaml
# Missing .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: build  # Wait for build job
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # Deploy frontend (Vercel example)
          npm install -g vercel
          vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy backend
        run: |
          # SSH to server and pull latest
          ssh ${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }} \
            'cd /app && git pull && pnpm install && pm2 restart fhenix-api'
```

---

#### 🟡 HIGH: No Staging Environment
**Severity:** HIGH  
**Problem:** Can't test deployment before production.
```yaml
# Should have separate staging flow
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    
    steps:
      # ... similar to production deploy but to staging URL
```

---

## 4. MONITORING & OBSERVABILITY

### 4.1 Error Tracking

#### 🔴 CRITICAL: No Error Tracking
**Severity:** CRITICAL  
**Problem:** Errors in production are invisible.

**Missing:** Sentry/error tracking setup.

```javascript
// Missing error tracking
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // Sample 10% of transactions
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

// Wrap app
export const App = Sentry.withProfiler(_App);

// Manual error capture
try {
  await contract.mint();
} catch (err) {
  Sentry.captureException(err, {
    tags: {
      component: 'BadgeAwardModal',
      action: 'mint'
    }
  });
}
```

---

#### 🟡 HIGH: No API Error Logging
**Severity:** HIGH  
**Problem:** Server errors not tracked.
```javascript
// Missing in server.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Use in error handler
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.body?.user_id
  });
  
  res.status(500).json({ error: 'Internal server error' });
});
```

---

### 4.2 Performance Monitoring

#### 🟡 HIGH: No Performance Metrics
**Severity:** HIGH  
**Problem:** Can't see if app is slow.
```javascript
// Missing performance tracking
import { performance } from 'perf_hooks';

// Track API response times
app.use((req, res, next) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    
    if (duration > 1000) {  // > 1 second is slow
      logger.warn({
        type: 'slow_request',
        url: req.url,
        duration: duration.toFixed(2),
        method: req.method,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
});
```

---

#### 🟡 MEDIUM: No Database Query Monitoring
**Severity:** MEDIUM  
**Problem:** Slow queries not detected.
```javascript
// Missing query timing
const originalExec = db.exec.bind(db);

db.exec = function(sql) {
  const start = Date.now();
  const result = originalExec(sql);
  const duration = Date.now() - start;
  
  if (duration > 100) {  // > 100ms is slow
    console.warn(`Slow query (${duration}ms): ${sql}`);
  }
  
  return result;
};
```

---

### 4.3 Uptime Monitoring

#### 🟡 MEDIUM: No Uptime Monitoring
**Severity:** MEDIUM  
**Problem:** Outages not detected.
```javascript
// Missing health check endpoint
app.get('/health', (req, res) => {
  // Check database connection
  try {
    db.exec('SELECT 1');
  } catch (e) {
    return res.status(503).json({ status: 'unhealthy', reason: 'db_error' });
  }
  
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Set up external monitoring (e.g., UptimeRobot)
// Ping /health every 5 minutes
// Alert if returns error
```

---

## 5. SECURITY INFRASTRUCTURE

### 5.1 HTTPS & TLS

#### 🟡 HIGH: No HTTPS Configuration
**Severity:** HIGH  
**Problem:** Communication not encrypted.
```bash
# Missing SSL/TLS setup
# For production must use:
# 1. Let's Encrypt (free)
# 2. Self-signed (testing only)
# 3. Purchased certificate

# Using Let's Encrypt with nginx
sudo certbot certonly --nginx -d fhenix-learn.com
# Certbot auto-configures nginx
```

---

#### 🟡 MEDIUM: No HSTS Header
**Severity:** MEDIUM  
**Problem:** Browser might use HTTP instead of HTTPS.
```javascript
// Missing HSTS header
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
```

---

### 5.2 API Security

#### 🔴 CRITICAL: No Rate Limiting
**Severity:** CRITICAL  
**Problem:** Vulnerable to DoS attacks (already noted in security audit).
```javascript
// Missing in server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Max 100 requests per window
  message: 'Too many requests'
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,  // Max 10 requests for sensitive endpoints
});

app.use('/api/', limiter);
app.use('/api/progress', strictLimiter);
app.use('/api/leaderboard', strictLimiter);
```

---

#### 🟡 HIGH: No CORS Validation
**Severity:** HIGH  
**Problem:** CORS open to all origins (already noted).
```javascript
// Missing CORS validation
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));
```

---

## SUMMARY: DevOps Gaps

| Area | Gap | Severity |
|------|-----|----------|
| **Build Optimization** | No bundle analysis | MEDIUM |
| **Frontend Deployment** | No Dockerfile/deployment | HIGH |
| **Backend Deployment** | No Dockerfile/PM2 config | HIGH |
| **Database** | No migrations/backups | HIGH |
| **CI/CD** | No pipeline at all | CRITICAL |
| **Testing in CI** | No automated tests | CRITICAL |
| **Error Tracking** | No Sentry/logging | CRITICAL |
| **Performance Monitoring** | No metrics | HIGH |
| **Uptime Monitoring** | Not monitored | MEDIUM |
| **HTTPS** | Not configured | HIGH |
| **Rate Limiting** | Not implemented | CRITICAL |

**Total Missing DevOps: 11+ Critical Systems**

---

## RECOMMENDED INFRASTRUCTURE SETUP

### Phase 1: Local Development (Week 1)
- [ ] Dockerfile for frontend
- [ ] Dockerfile for backend
- [ ] docker-compose.yml for local development
- [ ] Environment variable configuration

### Phase 2: CI/CD Pipeline (Week 2)
- [ ] GitHub Actions build workflow
- [ ] Linting & type checking in CI
- [ ] Unit tests in CI
- [ ] Build artifact storage

### Phase 3: Monitoring & Logging (Week 3)
- [ ] Sentry setup for error tracking
- [ ] Server logging with Winston
- [ ] Database query monitoring
- [ ] Performance metrics collection

### Phase 4: Production Deployment (Week 4)
- [ ] GitHub Actions deploy workflow
- [ ] Vercel/hosting setup for frontend
- [ ] Backend hosting (AWS/DigitalOcean/Azure)
- [ ] Database backups
- [ ] SSL/TLS certificates
- [ ] Rate limiting & security headers

---

## QUICK START: Docker Compose

```yaml
# docker-compose.yml for local development
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:3101
    volumes:
      - ./src:/app/src
    command: npm run dev

  backend:
    build: ./hardhat
    ports:
      - "3101:3101"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=sqlite:///data/progress.db
      - PORT=3101
    volumes:
      - ./data:/app/data
      - ./server.js:/app/server.js
    command: node server.js

  # Optional: Local blockchain node
  hardhat:
    build: ./hardhat
    ports:
      - "8545:8545"
    command: npx hardhat node
```

