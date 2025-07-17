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
  
  // Your domain - Updated dengan URL Netlify yang sebenarnya
  ownDomain: 'https://elegant-kleicha-42b5e8.netlify.app',
  
  // App store links
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.bpjstku',
  appStoreUrl: 'https://apps.apple.com/app/YOUR_IOS_APP_ID'
};

// Middleware
app.use(express.json());
app.use(express.static('public')); // Untuk serve static files

// Main redirect endpoint
app.get('/r/:type', (req, res) => {
  const { type } = req.params;
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = isIOS || isAndroid;
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
  
  // Log untuk analytics
  console.log('Redirect request:', {
    type, userAgent: userAgent.slice(0, 100), referer, isMobile, isBot
  });
  
  if (isBot) {
    // For bots (social media crawlers), return rich meta tags
    return res.send(generateBotResponse(type));
  }
  
  if (isAndroid) {
    // Android: Coba berbagai kemungkinan scheme
    const possibleSchemes = [
      'jmo://cek-saldo',
      'bpjstku://cek-saldo', 
      'com.bpjstku://cek-saldo',
      'intent://cek-saldo#Intent;scheme=jmo;package=com.bpjstku;end'
    ];
    
    // Ambil scheme dari query parameter jika ada, atau gunakan default
    const schemeIndex = parseInt(req.query.attempt || '0');
    const targetScheme = possibleSchemes[schemeIndex] || possibleSchemes[0];
    
    console.log('Android detected - redirecting to:', targetScheme);
    
    // Jika sudah mencoba semua scheme, redirect ke Play Store
    if (schemeIndex >= possibleSchemes.length) {
      return res.redirect(CONFIG.playStoreUrl);
    }
    
    return res.redirect(targetScheme);
  }
  
  if (isIOS) {
    // iOS: Gunakan landing page karena lebih reliable
    return res.send(generateMobileRedirect(type, isIOS, isAndroid));
  }
  
  if (isMobile) {
    // Mobile lain: landing page
    return res.send(generateMobileRedirect(type, isIOS, isAndroid));
  } else {
    // Desktop users - show web version with app promotion
    return res.send(generateDesktopResponse(type));
  }
});

// Generate Firebase dynamic link on-demand
app.get('/firebase-link/:type', (req, res) => {
  const { type } = req.params;
  const targetUrl = `${CONFIG.ownDomain}/r/${type}`;
  
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
  const { type, useFirebase = false, metadata = {} } = req.body;
  
  let link;
  if (useFirebase) {
    // Generate Firebase link
    const targetUrl = `${CONFIG.ownDomain}/r/${type}`;
    link = `${CONFIG.firebaseDomain}/?` + 
      `link=${encodeURIComponent(targetUrl)}` +
      `&apn=${CONFIG.androidPackage}` +
      `&ibi=${CONFIG.iosBundleId}`;
  } else {
    // Generate own redirect link
    link = `${CONFIG.ownDomain}/r/${type}`;
  }
  
  res.json({ 
    link, 
    type: useFirebase ? 'firebase' : 'manual',
    metadata 
  });
});

function generateMobileRedirect(type, isIOS, isAndroid) {
  const targetUrl = `${CONFIG.ownDomain}/r/${type}`; // URL untuk fallback browser
  
  // Custom scheme untuk JMO - sesuaikan dengan yang ada di AndroidManifest.xml
  let customScheme;
  if (type === 'product' || type === 'cek-saldo') {
    customScheme = 'jmo://cek-saldo'; // Langsung ke halaman cek-saldo
  } else {
    customScheme = `jmo://${type}`; // Scheme JMO untuk halaman lain
  }
  
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
                opacity: 0;
                animation: fadeIn 1s ease-in 3s forwards;
            }
            @keyframes fadeIn {
                to { opacity: 1; }
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
            <a href="https://elegant-kleicha-42b5e8.netlify.app/" class="btn">
                Continue in Browser
            </a>
        </div>
        
        <script>
            console.log('Platform detection - Android: ${isAndroid}, iOS: ${isIOS}');
            
            let attempts = 0;
            const maxAttempts = 4;
            let appOpened = false;
            
            function tryOpenApp() {
                if (appOpened) return;
                
                attempts++;
                console.log('Attempt', attempts, 'to open app');
                
                if (${isAndroid}) {
                    if (attempts === 1) {
                        // Android: Coba custom scheme JMO
                        console.log('Trying JMO scheme: ${customScheme}');
                        window.location = '${customScheme}';
                    } else if (attempts === 2) {
                        // Coba scheme alternatif
                        console.log('Trying alternative scheme: bpjstku://cek-saldo');
                        window.location = 'bpjstku://cek-saldo';
                    } else if (attempts === 3) {
                        // Coba intent URL
                        console.log('Trying intent URL');
                        window.location = 'intent://cek-saldo#Intent;scheme=jmo;package=com.bpjstku;end';
                    } else {
                        // Fallback ke Play Store
                        console.log('Redirecting to Play Store');
                        window.location = '${CONFIG.playStoreUrl}';
                    }
                } else if (${isIOS}) {
                    if (attempts === 1) {
                        // iOS: Coba custom scheme dulu
                        console.log('Trying custom scheme: ${customScheme}');
                        window.location = '${customScheme}';
                    } else {
                        // Fallback ke App Store
                        console.log('Redirecting to App Store');
                        window.location = '${CONFIG.appStoreUrl}';
                    }
                }
                
                // Retry jika belum berhasil
                if (attempts < 4) {
                    setTimeout(tryOpenApp, 2000);
                }
            }
            
            // Deteksi jika app berhasil dibuka
            let startTime = Date.now();
            
            document.addEventListener('visibilitychange', function() {
                if (document.hidden) {
                    appOpened = true;
                    console.log('App likely opened successfully');
                }
            });
            
            window.addEventListener('blur', function() {
                if (Date.now() - startTime > 1000) {
                    appOpened = true;
                    console.log('App opened - window lost focus');
                }
            });
            
            // Mulai proses buka app
            setTimeout(tryOpenApp, 500);
            
            // Safety fallback - jika tidak ada yang terjadi dalam 8 detik
            setTimeout(function() {
                if (!appOpened && attempts === 0) {
                    console.log('Timeout - showing fallback options');
                    document.querySelector('.fallback-buttons').style.opacity = '1';
                    document.querySelector('.fallback-buttons').style.animation = 'none';
                }
            }, 8000);
        </script>
    </body>
    </html>
  `;
}

function generateDesktopResponse(type) {
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
            <p>Download our app for the best experience viewing ${type}</p>
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
            const mobileLink = '${CONFIG.ownDomain}/r/${type}';
            QRCode.toCanvas(document.getElementById('qr-code'), mobileLink, {
                width: 200,
                margin: 2
            });
        </script>
    </body>
    </html>
  `;
}

function generateBotResponse(type) {
  // Rich meta tags for social media sharing
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${type.charAt(0).toUpperCase() + type.slice(1)}</title>
        <meta property="og:title" content="${type.charAt(0).toUpperCase() + type.slice(1)}">
        <meta property="og:description" content="Check this out on our app!">
        <meta property="og:image" content="${CONFIG.ownDomain}/images/og-image.jpg">
        <meta property="og:url" content="${CONFIG.ownDomain}/${type}">
        <meta name="twitter:card" content="summary_large_image">
    </head>
    <body>
        <h1>${type.charAt(0).toUpperCase() + type.slice(1)}</h1>
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
  console.log(`Test URL: http://localhost:${PORT}/r/product`);
});