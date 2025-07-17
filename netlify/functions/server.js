const express = require('express');
const serverless = require('serverless-http');

const app = express();

// Configuration
const CONFIG = {
  // Firebase config (keep for backward compatibility)
  firebaseDomain: 'https://individual-engagement-3.web.app',
  
  // App config
  androidPackage: 'com.bpjstku',
  iosBundleId: 'com.yourapp.ios',
  iosAppId: 'YOUR_IOS_APP_ID',
  
  // Your domain - URL Netlify (new manual system)
  ownDomain: 'https://elegant-kleicha-42b5e8.netlify.app',
  
  // App store links
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.bpjstku',
  appStoreUrl: 'https://apps.apple.com/app/YOUR_IOS_APP_ID',
  
  // Strategy: hybrid system - support both Firebase and manual
  useHybridMode: true // Firebase + Manual simultaneously
};

// Middleware
app.use(express.json());

// Android App Links verification - TIDAK PERLU (app native tidak diubah)
// Firebase domain tetap handle App Links verification
// Manual domain hanya handle custom scheme fallback
app.get('/.well-known/assetlinks.json', (req, res) => {
  // Optional: untuk future app update, tapi tidak wajib untuk sistem sekarang
  res.json([{
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": CONFIG.androidPackage,
      "sha256_cert_fingerprints": [
        "TIDAK_DIPERLUKAN_UNTUK_BACKWARD_COMPATIBILITY" // Firebase tetap handle verification
      ]
    }
  }]);
});

// Main redirect endpoint - Support transisi dari Firebase
app.get('/r/:type', (req, res) => {
  const { type } = req.params;
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  // Ambil semua query parameters dari URL
  const queryParams = req.query;
  const queryString = Object.keys(queryParams).length > 0 
    ? '?' + new URLSearchParams(queryParams).toString() 
    : '';
  
  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = isIOS || isAndroid;
  const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
  
  // Log untuk analytics - termasuk source domain dan parameters
  console.log('Redirect request:', {
    type, 
    queryParams,
    queryString,
    userAgent: userAgent.slice(0, 100), 
    referer, 
    isMobile, 
    isBot,
    source: referer.includes('firebase') ? 'firebase' : 'manual'
  });
  
  if (isBot) {
    return res.send(generateBotResponse(type));
  }
  
  if (isAndroid) {
    // Android: Gunakan landing page dengan JavaScript untuk better fallback handling
    // Direct redirect ke custom scheme sering gagal di Android browser
    return res.send(generateMobileRedirect(type, isIOS, isAndroid, queryString));
  }
  
  if (isIOS) {
    // iOS: Gunakan landing page karena lebih reliable
    return res.send(generateMobileRedirect(type, isIOS, isAndroid, queryString));
  }
  
  if (isMobile) {
    // Mobile lain: landing page
    return res.send(generateMobileRedirect(type, isIOS, isAndroid, queryString));
  } else {
    // Desktop users - show web version with app promotion
    return res.send(generateDesktopResponse(type));
  }
});

// Generate Firebase dynamic link on-demand
app.get('/firebase-link/:type', (req, res) => {
  const { type } = req.params;
  const targetUrl = `${CONFIG.ownDomain}/r/${type}`;
  
  const firebaseLink = `${CONFIG.firebaseDomain}/?` + 
    `link=${encodeURIComponent(targetUrl)}` +
    `&apn=${CONFIG.androidPackage}` +
    `&ibi=${CONFIG.iosBundleId}` +
    `&isi=${CONFIG.iosAppId}`;
  
  res.json({ firebaseLink, targetUrl });
});

// Enhanced generate link - Support both Firebase dan Manual
app.post('/generate-link', (req, res) => {
  const { type, useFirebase = CONFIG.useHybridMode, metadata = {} } = req.body;
  
  let primaryLink, fallbackLink;
  
  if (useFirebase) {
    // Primary: Firebase Dynamic Link (untuk app existing)
    const targetUrl = `${CONFIG.ownDomain}/r/${type}`;
    primaryLink = `${CONFIG.firebaseDomain}/?` + 
      `link=${encodeURIComponent(targetUrl)}` +
      `&apn=${CONFIG.androidPackage}` +
      `&ibi=${CONFIG.iosBundleId}`;
    
    // Fallback: Manual direct link
    fallbackLink = `${CONFIG.ownDomain}/r/${type}`;
  } else {
    // Primary: Manual direct link
    primaryLink = `${CONFIG.ownDomain}/r/${type}`;
    
    // Fallback: Firebase Dynamic Link
    const targetUrl = `${CONFIG.ownDomain}/r/${type}`;
    fallbackLink = `${CONFIG.firebaseDomain}/?` + 
      `link=${encodeURIComponent(targetUrl)}` +
      `&apn=${CONFIG.androidPackage}` +
      `&ibi=${CONFIG.iosBundleId}`;
  }
  
  res.json({ 
    primaryLink,
    fallbackLink,
    type: useFirebase ? 'firebase-primary' : 'manual-primary',
    metadata,
    strategy: 'hybrid-backward-compatible'
  });
});

function generateMobileRedirect(type, isIOS, isAndroid, queryString = '') {
  const targetUrl = `${CONFIG.ownDomain}/r/${type}${queryString}`; // URL untuk fallback browser dengan parameters
  
  // Android: Prioritas Intent URL, bukan custom scheme
  let primaryScheme, fallbackSchemes;
  
  if (isAndroid) {
    // Android: Coba custom scheme dulu, baru Intent URL
    if (queryString) {
      primaryScheme = `bpjstku://${type}${queryString}`;
      fallbackScheme = `intent://${type}${queryString}#Intent;scheme=bpjstku;package=com.bpjstku;S.browser_fallback_url=${encodeURIComponent(CONFIG.playStoreUrl)};end`;
    } else {
      primaryScheme = `bpjstku://${type}?type=${type}`;
      fallbackScheme = `intent://${type}?type=${type}#Intent;scheme=bpjstku;package=com.bpjstku;S.browser_fallback_url=${encodeURIComponent(CONFIG.playStoreUrl)};end`;
    }
    
    fallbackSchemes = [
      primaryScheme,
      fallbackScheme,
      `bpjstku://${type}`,
      'bpjstku://'
    ];
  } else {
    // iOS: Custom scheme langsung
    if (queryString) {
      primaryScheme = `bpjstku://${type}${queryString}`;
    } else {
      primaryScheme = `bpjstku://${type}?type=${type}`;
    }
    
    fallbackSchemes = [`bpjstku://${type}`, 'bpjstku://'];
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Opening BPJSTKU App...</title>
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
            .debug-info {
                margin-top: 20px;
                font-size: 12px;
                opacity: 0.7;
                font-family: monospace;
            }
        </style>
    </head>
    <body>
        <h2>Opening BPJSTKU App...</h2>
        <div class="spinner"></div>
        <p>Redirecting with parameters: ${queryString || '?type=' + type}</p>
        
        <div class="fallback-buttons">
            <a href="${isIOS ? CONFIG.appStoreUrl : CONFIG.playStoreUrl}" class="btn">
                Download App
            </a>
            <a href="https://elegant-kleicha-42b5e8.netlify.app/" class="btn">
                Continue in Browser
            </a>
        </div>
        
        <div class="debug-info">
            Platform: ${isAndroid ? 'Android' : isIOS ? 'iOS' : 'Other'}<br>
            Target: ${type}${queryString || '?type=' + type}<br>
            Full URL: ${targetUrl}
        </div>
        
        <script>
            console.log('=== BPJSTKU Deep Link Debug ===');
            console.log('Platform - Android:', ${isAndroid}, 'iOS:', ${isIOS});
            console.log('Target type:', '${type}');
            console.log('Query string:', '${queryString}');
            console.log('Primary scheme:', '${primaryScheme}');
            
            let appOpened = false;
            let attempts = 0;
            
            function openApp() {
                if (appOpened) {
                    console.log('App already opened, skipping');
                    return;
                }
                
                attempts++;
                console.log('Attempt', attempts, 'to open app');
                
                if (${isAndroid}) {
                    if (attempts === 1) {
                        // Android: Coba custom scheme dulu (lebih universal)
                        console.log('Android attempt 1 - custom scheme:', '${primaryScheme}');
                        tryOpenWithIframe('${primaryScheme}');
                    } else if (attempts === 2) {
                        // Fallback ke Intent URL
                        console.log('Android attempt 2 - Intent URL:', '${typeof fallbackScheme !== 'undefined' ? fallbackScheme : 'undefined'}');
                        ${typeof fallbackScheme !== 'undefined' ? `window.location.href = '${fallbackScheme}';` : `window.location.href = '${CONFIG.playStoreUrl}';`}
                    } else {
                        // Final fallback ke Play Store
                        console.log('Android attempt 3 - Play Store');
                        window.location.href = '${CONFIG.playStoreUrl}';
                        return;
                    }
                } else if (${isIOS}) {
                    if (attempts === 1) {
                        // iOS: Custom scheme
                        console.log('iOS attempt 1 - custom scheme:', '${primaryScheme}');
                        tryOpenWithIframe('${primaryScheme}');
                    } else {
                        // Fallback ke App Store
                        console.log('iOS attempt 2 - App Store');
                        window.location.href = '${CONFIG.appStoreUrl}';
                        return;
                    }
                } else {
                    // Other mobile
                    console.log('Other mobile platform');
                    window.location.href = '${CONFIG.playStoreUrl}';
                    return;
                }
                
                // Retry setelah 3 detik jika belum berhasil
                if (attempts < 3) {
                    setTimeout(openApp, 3000);
                }
            }
            
            function tryOpenWithIframe(scheme) {
                // Method 1: Iframe (silent)
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = scheme;
                document.body.appendChild(iframe);
                
                // Method 2: Window location setelah delay singkat
                setTimeout(function() {
                    if (!appOpened) {
                        console.log('Iframe timeout, trying window.location');
                        try {
                            window.location.href = scheme;
                        } catch (e) {
                            console.log('Custom scheme failed:', e.message);
                        }
                    }
                }, 500);
                
                // Cleanup iframe
                setTimeout(function() {
                    if (iframe.parentNode) {
                        iframe.parentNode.removeChild(iframe);
                    }
                }, 2000);
            }
            
            // Event listeners untuk deteksi app opened
            let startTime = Date.now();
            
            function markAppOpened(source) {
                if (!appOpened) {
                    appOpened = true;
                    console.log('✅ App opened successfully via', source);
                    document.querySelector('.spinner').style.display = 'none';
                    document.querySelector('h2').textContent = 'Opening app...';
                }
            }
            
            // Method 1: Visibility change (paling reliable)
            document.addEventListener('visibilitychange', function() {
                if (document.hidden && Date.now() - startTime > 500) {
                    markAppOpened('visibility change');
                }
            });
            
            // Method 2: Window blur  
            window.addEventListener('blur', function() {
                if (Date.now() - startTime > 1000) {
                    markAppOpened('window blur');
                }
            });
            
            // Method 3: Page hide
            window.addEventListener('pagehide', function() {
                markAppOpened('page hide');
            });
            
            // Start app opening process
            console.log('Starting app opening process in 1 second...');
            setTimeout(function() {
                openApp();
                
                // Fallback timeout - show download options (increase timeout)
                setTimeout(function() {
                    if (!appOpened && attempts === 0) {
                        console.log('❌ App not opened after 10 seconds, showing fallback');
                        document.querySelector('.fallback-buttons').style.opacity = '1';
                        document.querySelector('.fallback-buttons').style.animation = 'none';
                        document.querySelector('h2').textContent = 'App not installed?';
                        document.querySelector('.spinner').style.display = 'none';
                    }
                }, 10000); // Increased from 5000 to 10000
            }, 1000);
            
            // Error handling
            window.addEventListener('error', function(e) {
                console.log('Error occurred:', e.message);
            });
            
            console.log('=== End Debug Info ===');
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
    </body>
    </html>
  `;
}

function generateBotResponse(type) {
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

// Health check
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

// Export as serverless function
module.exports.handler = serverless(app);
