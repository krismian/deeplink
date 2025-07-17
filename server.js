// server.js - Express server untuk handle redirect
const express = require('express');
const app = express();

// Configuration
const CONFIG = {
  // Firebase config (existing)
  firebaseDomain: 'https://individual-engagement-3.web.app',
  
  // App config
  androidPackage: 'com.bpjstku',
  iosBundleId: 'com.yourapp.ios',
  iosAppId: 'YOUR_IOS_APP_ID',
  
  // Your domain
  ownDomain: 'https://yourdomain.com',
  
  // App store links
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.bpjstku',
  appStoreUrl: 'https://apps.apple.com/app/YOUR_IOS_APP_ID'
};

// Middleware
app.use(express.json());
app.use(express.static('public')); // Untuk serve static files

// Main redirect endpoint
app.get('/r/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = isIOS || isAndroid;
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
  
  // Log untuk analytics
  console.log('Redirect request:', {
    type, id, userAgent: userAgent.slice(0, 100), referer, isMobile, isBot
  });
  
  if (isBot) {
    // For bots (social media crawlers), return rich meta tags
    return res.send(generateBotResponse(type, id));
  }
  
  if (isMobile) {
    // Mobile users - smart redirect
    return res.send(generateMobileRedirect(type, id, isIOS, isAndroid));
  } else {
    // Desktop users - show web version with app promotion
    return res.send(generateDesktopResponse(type, id));
  }
});

// Generate Firebase dynamic link on-demand
app.get('/firebase-link/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const targetUrl = `${CONFIG.ownDomain}/${type}/${id}`;
  
  // Generate Firebase dynamic link URL manually
  const firebaseLink = `${CONFIG.firebaseDomain}/?` + 
    `link=${encodeURIComponent(targetUrl)}` +
    `&apn=${CONFIG.androidPackage}` +
    `&ibi=${CONFIG.iosBundleId}` +
    `&isi=${CONFIG.iosAppId}`;
  
  res.json({ firebaseLink, targetUrl });
});

// API endpoint untuk generate link dari app
app.post('/generate-link', (req, res) => {
  const { type, id, useFirebase = false, metadata = {} } = req.body;
  
  let link;
  if (useFirebase) {
    // Generate Firebase link
    const targetUrl = `${CONFIG.ownDomain}/${type}/${id}`;
    link = `${CONFIG.firebaseDomain}/?` + 
      `link=${encodeURIComponent(targetUrl)}` +
      `&apn=${CONFIG.androidPackage}` +
      `&ibi=${CONFIG.iosBundleId}`;
  } else {
    // Generate own redirect link
    link = `${CONFIG.ownDomain}/r/${type}/${id}`;
  }
  
  res.json({ 
    link, 
    type: useFirebase ? 'firebase' : 'manual',
    metadata 
  });
});

function generateMobileRedirect(type, id, isIOS, isAndroid) {
  const targetUrl = `${CONFIG.ownDomain}/${type}/${id}`;
  const customScheme = `myapp://${type}/${id}`; // Gunakan scheme yang sudah ada dari Firebase
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Opening App...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                text-align: center; 
                padding: 50px 20px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 0;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
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
            .fallback-buttons {
                margin-top: 30px;
            }
            .btn {
                display: inline-block;
                padding: 12px 24px;
                margin: 10px;
                background: rgba(255,255,255,0.2);
                color: white;
                text-decoration: none;
                border-radius: 25px;
                border: 2px solid rgba(255,255,255,0.3);
                transition: all 0.3s ease;
            }
            .btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-2px);
            }
        </style>
    </head>
    <body>
        <h2>Opening App...</h2>
        <div class="spinner"></div>
        <p>If the app doesn't open automatically:</p>
        
        <div class="fallback-buttons">
            <a href="${isIOS ? CONFIG.appStoreUrl : CONFIG.playStoreUrl}" class="btn">
                Download App
            </a>
            <a href="${targetUrl}" class="btn">
                Continue in Browser
            </a>
        </div>
        
        <script>
            // Try multiple approaches for opening app
            let attempts = 0;
            const maxAttempts = 3;
            
            function tryOpenApp() {
                attempts++;
                console.log('Attempt', attempts, 'to open app');
                
                if (attempts === 1) {
                    // First try: Custom scheme
                    window.location = '${customScheme}';
                } else if (attempts === 2) {
                    // Second try: Firebase dynamic link
                    const firebaseLink = '${CONFIG.firebaseDomain}/?link=${encodeURIComponent(targetUrl)}&apn=${CONFIG.androidPackage}&ibi=${CONFIG.iosBundleId}';
                    window.location = firebaseLink;
                } else {
                    // Final fallback: App store
                    window.location = '${isIOS ? CONFIG.appStoreUrl : CONFIG.playStoreUrl}';
                }
                
                if (attempts < maxAttempts) {
                    setTimeout(tryOpenApp, 2000);
                }
            }
            
            // Start the process
            setTimeout(tryOpenApp, 500);
            
            // Listen for page visibility to detect if app opened
            document.addEventListener('visibilitychange', function() {
                if (document.hidden) {
                    console.log('App likely opened successfully');
                }
            });
        </script>
    </body>
    </html>
  `;
}

function generateDesktopResponse(type, id) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Get Our Mobile App</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 600px; 
                margin: 0 auto; 
                padding: 50px 20px;
                text-align: center;
            }
            .hero { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 60px 40px;
                border-radius: 20px;
                margin-bottom: 40px;
            }
            .app-badges img { 
                height: 60px; 
                margin: 0 10px;
            }
            .qr-section {
                background: #f8f9fa;
                padding: 30px;
                border-radius: 15px;
                margin: 30px 0;
            }
        </style>
    </head>
    <body>
        <div class="hero">
            <h1>Best Experience on Mobile</h1>
            <p>Download our app for the best experience viewing ${type} ${id}</p>
        </div>
        
        <div class="app-badges">
            <a href="${CONFIG.appStoreUrl}">
                <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on App Store">
            </a>
            <a href="${CONFIG.playStoreUrl}">
                <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" style="height: 60px;">
            </a>
        </div>
        
        <div class="qr-section">
            <h3>Scan QR Code</h3>
            <div id="qr-code"></div>
            <p>Scan this QR code with your phone to open in app</p>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
        <script>
            // Generate QR code for mobile link
            const mobileLink = '${CONFIG.ownDomain}/r/${type}/${id}';
            QRCode.toCanvas(document.getElementById('qr-code'), mobileLink, {
                width: 200,
                margin: 2
            });
        </script>
    </body>
    </html>
  `;
}

function generateBotResponse(type, id) {
  // Rich meta tags for social media sharing
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${type.charAt(0).toUpperCase() + type.slice(1)} ${id}</title>
        <meta property="og:title" content="${type.charAt(0).toUpperCase() + type.slice(1)} ${id}">
        <meta property="og:description" content="Check this out on our app!">
        <meta property="og:image" content="${CONFIG.ownDomain}/images/og-image.jpg">
        <meta property="og:url" content="${CONFIG.ownDomain}/${type}/${id}">
        <meta name="twitter:card" content="summary_large_image">
    </head>
    <body>
        <h1>${type.charAt(0).toUpperCase() + type.slice(1)} ${id}</h1>
        <p>View this content in our mobile app for the best experience.</p>
    </body>
    </html>
  `;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    config: {
      domain: CONFIG.ownDomain,
      firebase: CONFIG.firebaseDomain
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Redirect server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/r/product/123`);
});