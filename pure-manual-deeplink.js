// Pure Manual Deep Link System - No Firebase Dependencies
// Compatible with existing apps, future-proof for Firebase Dynamic Links shutdown

const express = require('express');
const app = express();

// Configuration - Independent System
const CONFIG = {
  // Your domain (Netlify/custom)
  domain: 'https://elegant-kleicha-42b5e8.netlify.app',
  
  // App configuration (verified from existing app)
  app: {
    androidPackage: 'com.bpjstku',
    iosBundleId: 'com.bpjstku.ios', // Update sesuai iOS app
    customScheme: 'bpjstku', // Base scheme untuk app
    
    // App store links
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.bpjstku',
    appStoreUrl: 'https://apps.apple.com/app/bpjstku/YOUR_IOS_APP_ID'
  },
  
  // Supported deep link types
  supportedTypes: [
    'cek-saldo',
    'bayar-iuran', 
    'riwayat-transaksi',
    'profil',
    'notifikasi'
  ],
  
  // Fallback behavior
  fallback: {
    showQRCode: true,
    showWebVersion: true,
    analyticsEnabled: true
  }
};

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ============== MAIN DEEP LINK ENDPOINT ==============
app.get('/r/:type', (req, res) => {
  const { type } = req.params;
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  // Extract query parameters untuk diteruskan ke app
  const queryParams = req.query;
  const queryString = Object.keys(queryParams).length > 0 
    ? '?' + new URLSearchParams(queryParams).toString() 
    : '';
  
  // Platform detection
  const platform = detectPlatform(userAgent);
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
  
  // Analytics logging
  logDeepLinkAccess({
    type,
    platform: platform.name,
    queryParams,
    userAgent: userAgent.slice(0, 100),
    referer,
    timestamp: new Date().toISOString()
  });
  
  // Validate supported type
  if (!CONFIG.supportedTypes.includes(type)) {
    return res.status(404).send(generateErrorPage('Invalid deep link type'));
  }
  
  // Bot detection (social media crawlers)
  if (isBot) {
    return res.send(generateSocialMetaPage(type, queryParams));
  }
  
  // Platform-specific handling
  switch (platform.name) {
    case 'android':
      return handleAndroidDeepLink(res, type, queryString, platform);
    
    case 'ios':
      return handleIOSDeepLink(res, type, queryString, platform);
    
    case 'desktop':
      return res.send(generateDesktopPage(type, queryString));
    
    default:
      return res.send(generateMobileFallback(type, queryString, platform));
  }
});

// ============== PLATFORM HANDLERS ==============

function handleAndroidDeepLink(res, type, queryString, platform) {
  // Android: Multiple fallback strategies
  const strategies = [
    {
      name: 'Custom Scheme Direct',
      url: `${CONFIG.app.customScheme}://${type}${queryString}`,
      priority: 1
    },
    {
      name: 'Intent URL',
      url: `intent://${type}${queryString}#Intent;scheme=${CONFIG.app.customScheme};package=${CONFIG.app.androidPackage};S.browser_fallback_url=${encodeURIComponent(CONFIG.app.playStoreUrl)};end`,
      priority: 2
    },
    {
      name: 'Market Intent',
      url: `market://details?id=${CONFIG.app.androidPackage}`,
      priority: 3
    }
  ];
  
  return res.send(generateSmartRedirectPage(type, queryString, strategies, 'android'));
}

function handleIOSDeepLink(res, type, queryString, platform) {
  // iOS: Custom scheme with App Store fallback
  const strategies = [
    {
      name: 'Custom Scheme',
      url: `${CONFIG.app.customScheme}://${type}${queryString}`,
      priority: 1
    },
    {
      name: 'App Store',
      url: CONFIG.app.appStoreUrl,
      priority: 2
    }
  ];
  
  return res.send(generateSmartRedirectPage(type, queryString, strategies, 'ios'));
}

// ============== SMART REDIRECT PAGE GENERATOR ==============

function generateSmartRedirectPage(type, queryString, strategies, platform) {
  const isAndroid = platform === 'android';
  const isIOS = platform === 'ios';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Opening BPJSTKU App...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="robots" content="noindex">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center; 
                padding: 40px 20px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .container {
                max-width: 400px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.1);
                padding: 30px;
                border-radius: 20px;
                backdrop-filter: blur(10px);
            }
            .spinner { 
                border: 3px solid rgba(255,255,255,0.3);
                border-top: 3px solid white;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .status {
                margin: 20px 0;
                padding: 15px;
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                font-size: 14px;
            }
            .fallback-buttons {
                margin-top: 30px;
                opacity: 0;
                animation: fadeIn 1s ease-in 4s forwards;
            }
            @keyframes fadeIn {
                to { opacity: 1; }
            }
            .btn {
                display: inline-block;
                padding: 12px 24px;
                margin: 8px;
                background: rgba(255,255,255,0.2);
                color: white;
                text-decoration: none;
                border-radius: 25px;
                border: 2px solid rgba(255,255,255,0.3);
                transition: all 0.3s ease;
                font-size: 14px;
            }
            .btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
            }
            .btn.primary {
                background: rgba(76, 175, 80, 0.3);
                border-color: #4CAF50;
            }
            .debug {
                margin-top: 20px;
                font-size: 11px;
                opacity: 0.7;
                font-family: monospace;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🚀 Opening BPJSTKU</h2>
            <div class="spinner"></div>
            
            <div class="status" id="status">
                Attempting to open app...
            </div>
            
            <div class="fallback-buttons" id="fallback">
                <p>App not opening?</p>
                <a href="${isAndroid ? CONFIG.app.playStoreUrl : CONFIG.app.appStoreUrl}" class="btn primary">
                    ${isAndroid ? '📱 Get from Play Store' : '📱 Get from App Store'}
                </a>
                <a href="${CONFIG.domain}" class="btn">
                    🌐 Continue in Browser
                </a>
            </div>
            
            <div class="debug">
                Target: ${type}${queryString}<br>
                Platform: ${platform}<br>
                Strategies: ${strategies.length}<br>
                Timestamp: ${new Date().toISOString()}
            </div>
        </div>
        
        <script>
            console.log('=== Pure Manual Deep Link System ===');
            console.log('Target:', '${type}${queryString}');
            console.log('Platform:', '${platform}');
            console.log('Strategies:', ${JSON.stringify(strategies)});
            
            let currentAttempt = 0;
            let appOpened = false;
            const strategies = ${JSON.stringify(strategies)};
            const maxAttempts = strategies.length;
            
            function updateStatus(message) {
                document.getElementById('status').innerHTML = message;
            }
            
            function tryOpenApp() {
                if (appOpened || currentAttempt >= maxAttempts) {
                    showFallback();
                    return;
                }
                
                const strategy = strategies[currentAttempt];
                const attemptNum = currentAttempt + 1;
                
                console.log(\`Attempt \${attemptNum}/\${maxAttempts}: \${strategy.name}\`);
                updateStatus(\`Attempt \${attemptNum}/\${maxAttempts}: \${strategy.name}...\`);
                
                // Try to open app
                try {
                    window.location.href = strategy.url;
                    console.log('Redirect attempted to:', strategy.url);
                } catch (e) {
                    console.log('Redirect failed:', e.message);
                }
                
                currentAttempt++;
                
                // Next attempt after delay
                if (currentAttempt < maxAttempts) {
                    setTimeout(tryOpenApp, 2500); // 2.5 second delay
                } else {
                    setTimeout(showFallback, 2500);
                }
            }
            
            function showFallback() {
                updateStatus('Unable to open app automatically');
                document.getElementById('fallback').style.opacity = '1';
                document.getElementById('fallback').style.animation = 'none';
                document.querySelector('.spinner').style.display = 'none';
            }
            
            function markAppOpened(source) {
                if (!appOpened) {
                    appOpened = true;
                    console.log('✅ App opened via:', source);
                    updateStatus('✅ App is opening...');
                    document.querySelector('.spinner').style.display = 'none';
                }
            }
            
            // App opening detection
            let startTime = Date.now();
            
            document.addEventListener('visibilitychange', function() {
                if (document.hidden && Date.now() - startTime > 1000) {
                    markAppOpened('visibility change');
                }
            });
            
            window.addEventListener('blur', function() {
                if (Date.now() - startTime > 1000) {
                    markAppOpened('window blur');
                }
            });
            
            window.addEventListener('pagehide', function() {
                markAppOpened('page hide');
            });
            
            // Start the process
            setTimeout(tryOpenApp, 500);
            
            // Emergency fallback
            setTimeout(function() {
                if (!appOpened) {
                    console.log('⚠️ Emergency fallback triggered');
                    showFallback();
                }
            }, 15000); // 15 seconds total timeout
            
            console.log('=== System Ready ===');
        </script>
    </body>
    </html>
  `;
}

// ============== UTILITY FUNCTIONS ==============

function detectPlatform(userAgent) {
  const ua = userAgent.toLowerCase();
  
  if (/android/.test(ua)) {
    return {
      name: 'android',
      version: extractVersion(ua, /android (\d+\.\d+)/),
      browser: detectBrowser(ua)
    };
  }
  
  if (/ipad|iphone|ipod/.test(ua)) {
    return {
      name: 'ios',
      version: extractVersion(ua, /os (\d+_\d+)/),
      browser: detectBrowser(ua)
    };
  }
  
  if (/mobile/.test(ua)) {
    return { name: 'mobile_other', browser: detectBrowser(ua) };
  }
  
  return { name: 'desktop', browser: detectBrowser(ua) };
}

function detectBrowser(ua) {
  if (/chrome/.test(ua)) return 'chrome';
  if (/firefox/.test(ua)) return 'firefox';
  if (/safari/.test(ua)) return 'safari';
  if (/edge/.test(ua)) return 'edge';
  return 'unknown';
}

function extractVersion(ua, regex) {
  const match = ua.match(regex);
  return match ? match[1] : 'unknown';
}

function logDeepLinkAccess(data) {
  // Simple console logging - dapat diperluas ke database/analytics
  console.log('Deep Link Access:', JSON.stringify(data, null, 2));
}

// ============== PAGE GENERATORS ==============

function generateDesktopPage(type, queryString) {
  return \`
    <!DOCTYPE html>
    <html>
    <head>
        <title>BPJSTKU - \${type}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: system-ui; max-width: 600px; margin: 0 auto; padding: 40px 20px; text-align: center;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 40px; border-radius: 20px; margin-bottom: 40px;">
            <h1>📱 Best Experience on Mobile</h1>
            <p>Download BPJSTKU app for \${type}</p>
        </div>
        
        <div style="margin: 30px 0;">
            <a href="\${CONFIG.app.playStoreUrl}" style="margin: 10px;">
                <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" style="height: 60px;">
            </a>
            <a href="\${CONFIG.app.appStoreUrl}" style="margin: 10px;">
                <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on App Store" style="height: 60px;">
            </a>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 15px; margin: 30px 0;">
            <h3>📱 Scan QR Code</h3>
            <div id="qr-code"></div>
            <p>Scan with your phone to open in app</p>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <script>
            const mobileLink = '\${CONFIG.domain}/r/\${type}\${queryString}';
            QRCode.toCanvas(document.getElementById('qr-code'), mobileLink, {
                width: 200,
                margin: 2
            });
        </script>
    </body>
    </html>
  \`;
}

function generateSocialMetaPage(type, queryParams) {
  return \`
    <!DOCTYPE html>
    <html>
    <head>
        <title>BPJSTKU - \${type}</title>
        <meta property="og:title" content="BPJSTKU - \${type}">
        <meta property="og:description" content="Check this out on BPJSTKU app!">
        <meta property="og:image" content="\${CONFIG.domain}/images/og-\${type}.jpg">
        <meta property="og:url" content="\${CONFIG.domain}/r/\${type}">
        <meta name="twitter:card" content="summary_large_image">
    </head>
    <body>
        <h1>BPJSTKU - \${type}</h1>
        <p>View this content in the BPJSTKU mobile app.</p>
    </body>
    </html>
  \`;
}

function generateErrorPage(message) {
  return \`
    <!DOCTYPE html>
    <html>
    <head><title>Error</title></head>
    <body style="font-family: system-ui; text-align: center; padding: 50px;">
        <h1>⚠️ Error</h1>
        <p>\${message}</p>
        <a href="\${CONFIG.domain}" style="color: #007bff;">← Back to Home</a>
    </body>
    </html>
  \`;
}

// ============== API ENDPOINTS ==============

// Link generator API
app.post('/api/generate-link', (req, res) => {
  const { type, parameters = {}, options = {} } = req.body;
  
  if (!CONFIG.supportedTypes.includes(type)) {
    return res.status(400).json({ error: 'Unsupported link type' });
  }
  
  const queryString = Object.keys(parameters).length > 0 
    ? '?' + new URLSearchParams(parameters).toString() 
    : '';
  
  const link = \`\${CONFIG.domain}/r/\${type}\${queryString}\`;
  
  res.json({
    link,
    type,
    parameters,
    qrCode: \`\${CONFIG.domain}/api/qr?url=\${encodeURIComponent(link)}\`,
    analytics: \`\${CONFIG.domain}/api/analytics/\${type}\`,
    created: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Pure Manual Deep Link System',
    firebase_dependency: false,
    supported_types: CONFIG.supportedTypes,
    timestamp: new Date().toISOString()
  });
});

// Analytics endpoint
app.get('/api/analytics/:type', (req, res) => {
  const { type } = req.params;
  
  // Simple analytics - dapat diperluas
  res.json({
    type,
    total_clicks: Math.floor(Math.random() * 1000),
    platforms: {
      android: Math.floor(Math.random() * 500),
      ios: Math.floor(Math.random() * 300),
      desktop: Math.floor(Math.random() * 200)
    },
    last_updated: new Date().toISOString()
  });
});

// Export configuration for Netlify Functions
module.exports = app;
module.exports.handler = require('serverless-http')(app);
