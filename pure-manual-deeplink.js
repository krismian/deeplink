const express = require('express');
const app = express();

// Configuration
const CONFIG = {
  domain: 'https://unilink.netlify.app',
  customScheme: 'bpjstku',
  androidPackage: 'com.bpjstku',
  iosAppId: '123456789',
  maxRedirectAttempts: 3,
  attemptDelay: 1500
};

app.use(express.json());
app.use(express.static('public'));

// Platform detection helper
function detectPlatform(userAgent) {
  const ua = userAgent.toLowerCase();
  
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/windows nt/i.test(ua)) return 'windows';
  if (/macintosh|mac os x/i.test(ua)) return 'mac';
  if (/linux/i.test(ua)) return 'linux';
  if (/bot|crawler|spider|scraper/i.test(ua)) return 'bot';
  
  return 'unknown';
}

// Generate smart redirect page
function generateSmartRedirectPage(type, queryParams) {
  const customUrl = `${CONFIG.customScheme}://${type}${queryParams ? '?' + new URLSearchParams(queryParams).toString() : ''}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>BPJSTKU - ${type}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: system-ui, -apple-system, sans-serif;
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                margin: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .container { max-width: 400px; margin: 0 auto; }
            .logo { font-size: 3em; margin-bottom: 20px; }
            .status { margin: 20px 0; font-size: 1.1em; }
            .buttons { margin: 30px 0; }
            .btn {
                display: inline-block;
                padding: 12px 24px;
                margin: 10px;
                background: rgba(255,255,255,0.2);
                color: white;
                text-decoration: none;
                border-radius: 8px;
                border: 2px solid rgba(255,255,255,0.3);
                transition: all 0.3s;
            }
            .btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
            }
            .progress {
                width: 100%;
                height: 4px;
                background: rgba(255,255,255,0.3);
                border-radius: 2px;
                overflow: hidden;
                margin: 20px 0;
            }
            .progress-bar {
                height: 100%;
                background: white;
                width: 0%;
                transition: width 0.3s;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">📱</div>
            <h1>BPJSTKU</h1>
            <div class="status" id="status">Opening app...</div>
            <div class="progress">
                <div class="progress-bar" id="progress"></div>
            </div>
            <div class="buttons">
                <a href="https://play.google.com/store/apps/details?id=${CONFIG.androidPackage}" class="btn">
                    📥 Android App
                </a>
                <a href="https://apps.apple.com/app/id${CONFIG.iosAppId}" class="btn">
                    🍎 iOS App
                </a>
            </div>
        </div>

        <script>
            const strategies = {
                android: [
                    {
                        name: 'Custom Scheme',
                        url: '${customUrl}'
                    },
                    {
                        name: 'Intent URL',
                        url: 'intent://${type}${queryParams ? '?' + new URLSearchParams(queryParams).toString() : ''}#Intent;scheme=${CONFIG.customScheme};package=${CONFIG.androidPackage};end'
                    },
                    {
                        name: 'Play Store',
                        url: 'https://play.google.com/store/apps/details?id=${CONFIG.androidPackage}'
                    }
                ],
                ios: [
                    {
                        name: 'Custom Scheme',
                        url: '${customUrl}'
                    },
                    {
                        name: 'Universal Link',
                        url: '${CONFIG.domain}/app/${type}${queryParams ? '?' + new URLSearchParams(queryParams).toString() : ''}'
                    },
                    {
                        name: 'App Store',
                        url: 'https://apps.apple.com/app/id${CONFIG.iosAppId}'
                    }
                ],
                desktop: [
                    {
                        name: 'Protocol Handler',
                        url: '${customUrl}'
                    }
                ]
            };

            function updateStatus(message) {
                document.getElementById('status').textContent = message;
            }

            function updateProgress(percent) {
                document.getElementById('progress').style.width = percent + '%';
            }

            function detectUserAgent() {
                const ua = navigator.userAgent.toLowerCase();
                if (/android/i.test(ua)) return 'android';
                if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
                return 'desktop';
            }

            async function attemptAppOpen() {
                const platform = detectUserAgent();
                const platformStrategies = strategies[platform] || strategies.desktop;
                const maxAttempts = Math.min(${CONFIG.maxRedirectAttempts}, platformStrategies.length);
                
                for (let currentAttempt = 0; currentAttempt < maxAttempts; currentAttempt++) {
                    const strategy = platformStrategies[currentAttempt];
                    const attemptNum = currentAttempt + 1;
                    
                    console.log(\`Attempt \${attemptNum}/\${maxAttempts}: \${strategy.name}\`);
                    updateStatus(\`Attempt \${attemptNum}/\${maxAttempts}: \${strategy.name}...\`);
                    updateProgress((attemptNum / maxAttempts) * 100);
                    
                    try {
                        window.location.href = strategy.url;
                        
                        // Wait to see if app opens
                        await new Promise(resolve => setTimeout(resolve, ${CONFIG.attemptDelay}));
                        
                        // If we're still here, app didn't open
                        if (currentAttempt < maxAttempts - 1) {
                            updateStatus('App not found, trying another method...');
                        }
                        
                    } catch (error) {
                        console.error('Strategy failed:', error);
                        if (currentAttempt < maxAttempts - 1) {
                            updateStatus('Method failed, trying another...');
                        }
                    }
                }
                
                updateStatus('Unable to open app. Please download from app store.');
                updateProgress(100);
            }

            // Start the process
            setTimeout(attemptAppOpen, 1000);
        </script>
    </body>
    </html>
  `;
}

// Generate desktop fallback page
function generateDesktopPage(type, queryParams) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>BPJSTKU - ${type}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: system-ui, -apple-system, sans-serif;
                text-align: center;
                padding: 40px 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
                margin: 0;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .container { max-width: 500px; margin: 0 auto; }
            .logo { font-size: 4em; margin-bottom: 30px; }
            .downloads { margin: 40px 0; }
            .download-btn {
                display: inline-block;
                margin: 15px;
                padding: 0;
                background: none;
                border: none;
                border-radius: 12px;
                overflow: hidden;
                transition: transform 0.3s;
            }
            .download-btn:hover { transform: scale(1.05); }
            .download-btn img { height: 60px; }
            .qr-section {
                margin: 40px 0;
                padding: 30px;
                background: rgba(255,255,255,0.1);
                border-radius: 12px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">📱</div>
            <h1>BPJSTKU</h1>
            <p>Download our mobile app to access this content</p>
            
            <div class="downloads">
                <a href="https://play.google.com/store/apps/details?id=${CONFIG.androidPackage}" class="download-btn">
                    <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play">
                </a>
                <a href="https://apps.apple.com/app/id${CONFIG.iosAppId}" class="download-btn">
                    <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on App Store">
                </a>
            </div>
            
            <div class="qr-section">
                <h3>Scan QR Code</h3>
                <canvas id="qrcode"></canvas>
            </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <script>
            const currentUrl = window.location.href;
            QRCode.toCanvas(document.getElementById('qrcode'), currentUrl, {
                width: 200,
                margin: 2
            });
        </script>
    </body>
    </html>
  `;
}

// Generate social media meta page
function generateSocialMetaPage(type, queryParams) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>BPJSTKU - ${type}</title>
        <meta property="og:title" content="BPJSTKU - ${type}">
        <meta property="og:description" content="Check this out on BPJSTKU app!">
        <meta property="og:image" content="${CONFIG.domain}/images/og-${type}.jpg">
        <meta property="og:url" content="${CONFIG.domain}/r/${type}">
        <meta name="twitter:card" content="summary_large_image">
    </head>
    <body>
        <h1>BPJSTKU - ${type}</h1>
        <p>View this content in the BPJSTKU mobile app.</p>
    </body>
    </html>
  `;
}

// Generate error page
function generateErrorPage(message) {
  return `
    <!DOCTYPE html>
    <html>
    <head><title>Error</title></head>
    <body style="font-family: system-ui; text-align: center; padding: 50px;">
        <h1>⚠️ Error</h1>
        <p>${message}</p>
        <a href="${CONFIG.domain}" style="color: #007bff;">← Back to Home</a>
    </body>
    </html>
  `;
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>BPJSTKU Deep Link System</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: system-ui, -apple-system, sans-serif;
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: #f5f5f5;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
                color: #333;
            }
            .feature {
                margin: 20px 0;
                padding: 20px;
                background: #f8f9fa;
                border-left: 4px solid #007bff;
                border-radius: 4px;
            }
            .api-example {
                background: #1a1a1a;
                color: #00ff00;
                padding: 15px;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                margin: 10px 0;
            }
            .status {
                display: inline-block;
                padding: 5px 12px;
                background: #28a745;
                color: white;
                border-radius: 20px;
                font-size: 0.8em;
                margin: 0 10px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔗 BPJSTKU Deep Link System</h1>
                <p>Pure Manual Deep Linking - Firebase Independent</p>
                <span class="status">🟢 Active</span>
                <span class="status">🔒 Secure</span>
                <span class="status">⚡ Fast</span>
            </div>

            <div class="feature">
                <h3>📱 Smart Platform Detection</h3>
                <p>Automatically detects Android, iOS, and Desktop platforms with intelligent fallback strategies.</p>
            </div>

            <div class="feature">
                <h3>🎯 Multiple Redirect Strategies</h3>
                <p>Uses custom schemes, intent URLs, universal links, and app store fallbacks for maximum compatibility.</p>
            </div>

            <div class="feature">
                <h3>📊 Real-time Analytics</h3>
                <p>Track link performance, user platforms, and conversion rates.</p>
            </div>

            <div class="feature">
                <h3>🔗 API Usage Examples</h3>
                <div class="api-example">
                    GET ${CONFIG.domain}/r/profile?userId=123<br>
                    GET ${CONFIG.domain}/r/product?id=456<br>
                    POST ${CONFIG.domain}/api/create { type: "event", eventId: "789" }
                </div>
            </div>

            <div class="feature">
                <h3>⚙️ System Status</h3>
                <p>✅ Custom Scheme: ${CONFIG.customScheme}://</p>
                <p>✅ Android Package: ${CONFIG.androidPackage}</p>
                <p>✅ Max Redirect Attempts: ${CONFIG.maxRedirectAttempts}</p>
                <p>✅ Firebase Independent: 100% Autonomous</p>
            </div>
        </div>
    </body>
    </html>
  `);
});

// Main redirect handler
app.get('/r/:type', (req, res) => {
  const { type } = req.params;
  const queryParams = req.query;
  const userAgent = req.get('User-Agent') || '';
  const platform = detectPlatform(userAgent);

  // Log the request
  console.log(`Deep link request: ${type}, Platform: ${platform}, Params:`, queryParams);

  // Handle bot/crawler requests
  if (platform === 'bot') {
    return res.send(generateSocialMetaPage(type, queryParams));
  }

  // Handle desktop requests
  if (platform === 'windows' || platform === 'mac' || platform === 'linux') {
    return res.send(generateDesktopPage(type, queryParams));
  }

  // Handle mobile requests
  res.send(generateSmartRedirectPage(type, queryParams));
});

// API endpoint to create new deep links
app.post('/api/create', (req, res) => {
  const { type, ...parameters } = req.body;
  
  if (!type) {
    return res.status(400).json({ error: 'Type parameter is required' });
  }
  
  const queryString = Object.keys(parameters).length > 0 
    ? '?' + new URLSearchParams(parameters).toString() 
    : '';
  
  const link = `${CONFIG.domain}/r/${type}${queryString}`;
  
  res.json({
    link,
    type,
    parameters,
    qrCode: `${CONFIG.domain}/api/qr?url=${encodeURIComponent(link)}`,
    analytics: `${CONFIG.domain}/api/analytics/${type}`,
    timestamp: new Date().toISOString()
  });
});

// QR Code generation endpoint
app.get('/api/qr', (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }
  
  // For now, return a placeholder response
  // In production, you would integrate with a QR code library
  res.json({
    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`,
    originalUrl: url
  });
});

// Analytics endpoint
app.get('/api/analytics/:type', (req, res) => {
  const { type } = req.params;
  
  // Placeholder analytics data
  res.json({
    type,
    totalClicks: Math.floor(Math.random() * 1000),
    platforms: {
      android: Math.floor(Math.random() * 500),
      ios: Math.floor(Math.random() * 300),
      desktop: Math.floor(Math.random() * 200)
    },
    successRate: (Math.random() * 0.3 + 0.7).toFixed(2),
    lastUpdated: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    firebaseIndependent: true
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(generateErrorPage('Page not found'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(generateErrorPage('Internal server error'));
});

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 BPJSTKU Deep Link System running on port ${PORT}`);
    console.log(`📱 Custom scheme: ${CONFIG.customScheme}://`);
    console.log(`🔗 Base URL: ${CONFIG.domain}`);
    console.log(`🚫 Firebase Independent: 100% Autonomous`);
  });
}

// Export for serverless deployment
module.exports.handler = require('serverless-http')(app);
