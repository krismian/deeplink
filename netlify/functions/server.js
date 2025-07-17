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
  let primaryScheme, fallbackScheme;
  
  if (isAndroid) {
    // Android: Coba custom scheme dulu, baru Intent URL
    if (queryString) {
      // Jika ada query parameters, teruskan ke app dengan type dari path
      primaryScheme = `bpjstku://${type}${queryString}`;
      fallbackScheme = `intent://${type}${queryString}#Intent;scheme=bpjstku;package=com.bpjstku;S.browser_fallback_url=${encodeURIComponent(CONFIG.playStoreUrl)};end`;
    } else {
      // Jika tidak ada query parameters, gunakan type dari path saja tanpa parameter tambahan
      primaryScheme = `bpjstku://${type}`;
      fallbackScheme = `intent://${type}#Intent;scheme=bpjstku;package=com.bpjstku;S.browser_fallback_url=${encodeURIComponent(CONFIG.playStoreUrl)};end`;
    }
  } else {
    // iOS: Custom scheme langsung
    if (queryString) {
      // Jika ada query parameters, teruskan ke app dengan type dari path
      primaryScheme = `bpjstku://${type}${queryString}`;
    } else {
      // Jika tidak ada query parameters, gunakan type dari path saja
      primaryScheme = `bpjstku://${type}`;
    }
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
            .error-message {
                margin-top: 30px;
                padding: 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                border: 2px solid rgba(255, 255, 255, 0.2);
            }
            .error-message h3 {
                margin-top: 0;
                color: #ffeb3b;
            }
            .error-message ul {
                font-size: 14px;
                line-height: 1.5;
            }
            .error-message li {
                margin: 8px 0;
            }
            .attempt-info {
                margin-top: 15px;
                padding: 10px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <h2>Opening BPJSTKU App...</h2>
        <div class="spinner"></div>
        <p>Redirecting with parameters: ${queryString || 'no parameters'}</p>
        
        <div class="fallback-buttons">
            <a href="${isIOS ? CONFIG.appStoreUrl : CONFIG.playStoreUrl}" class="btn">
                Download App
            </a>
            <a href="https://elegant-kleicha-42b5e8.netlify.app/" class="btn">
                Continue in Browser
            </a>
        </div>
        
        <div class="error-message" style="display: none;">
            <h3>⚠️ Unable to Open App</h3>
            <p>We tried multiple methods to open the BPJSTKU app but were unsuccessful.</p>
            <p><strong>Possible reasons:</strong></p>
            <ul style="text-align: left; max-width: 300px; margin: 0 auto;">
                <li>App is not installed on your device</li>
                <li>App version doesn't support this deep link</li>
                <li>Browser restrictions preventing app launch</li>
            </ul>
            <p><strong>What you can do:</strong></p>
            <ul style="text-align: left; max-width: 300px; margin: 0 auto;">
                <li>Download the latest version of BPJSTKU app</li>
                <li>Try opening the link in a different browser</li>
                <li>Continue using our web version</li>
            </ul>
        </div>
        
        <div class="debug-info">
            Platform: ${isAndroid ? 'Android' : isIOS ? 'iOS' : 'Other'}<br>
            Target: ${type}${queryString || ''}<br>
            Full URL: ${targetUrl}
        </div>
        
        <div class="attempt-info" id="attemptInfo" style="display: none;">
            <strong>Attempting to open app...</strong>
            <div id="attemptDetails"></div>
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
                
                // Show attempt info
                updateAttemptInfo(attempts);
                
                if (${isAndroid}) {
                    if (attempts === 1) {
                        // Android: Coba custom scheme dulu (lebih universal)
                        console.log('Android attempt 1 - custom scheme:', '${primaryScheme}');
                        tryOpenWithIframe('${primaryScheme}');
                    } else if (attempts === 2) {
                        // Fallback ke Intent URL
                        console.log('Android attempt 2 - Intent URL:', '${fallbackScheme}');
                        window.location.href = '${fallbackScheme}';
                    } else {
                        // Final fallback ke Play Store
                        console.log('Android attempt 3 - Play Store');
                        showFailureMessage();
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
                        showFailureMessage();
                        return;
                    }
                } else {
                    // Other mobile
                    console.log('Other mobile platform');
                    showFailureMessage();
                    return;
                }
                
                // Retry setelah 2 detik jika belum berhasil (lebih cepat)
                if (attempts < 3) {
                    setTimeout(openApp, 2000); // Kurangi dari 3000 ke 2000
                }
            }
            
            function updateAttemptInfo(attemptNum) {
                const attemptInfo = document.getElementById('attemptInfo');
                const attemptDetails = document.getElementById('attemptDetails');
                
                attemptInfo.style.display = 'block';
                
                if (${isAndroid}) {
                    if (attemptNum === 1) {
                        attemptDetails.innerHTML = 'Step 1/3: Trying custom app scheme...';
                    } else if (attemptNum === 2) {
                        attemptDetails.innerHTML = 'Step 2/3: Trying Android Intent URL...';
                    } else {
                        attemptDetails.innerHTML = 'Step 3/3: All methods failed, showing options...';
                    }
                } else if (${isIOS}) {
                    if (attemptNum === 1) {
                        attemptDetails.innerHTML = 'Step 1/2: Trying custom app scheme...';
                    } else {
                        attemptDetails.innerHTML = 'Step 2/2: App not responding, showing options...';
                    }
                }
            }
            
            function showFailureMessage() {
                document.querySelector('.spinner').style.display = 'none';
                document.querySelector('h2').textContent = 'Unable to Open App';
                document.querySelector('p').textContent = 'We encountered issues opening the BPJSTKU app.';
                document.querySelector('.error-message').style.display = 'block';
                document.querySelector('.fallback-buttons').style.opacity = '1';
                document.querySelector('.fallback-buttons').style.animation = 'none';
                document.getElementById('attemptInfo').style.display = 'none';
            }
            
            function tryOpenWithIframe(scheme) {
                // Method 1: Direct window.location (paling agresif untuk mobile)
                try {
                    window.location.href = scheme;
                } catch (e) {
                    console.log('Direct scheme failed:', e.message);
                }
                
                // Method 2: Iframe sebagai backup (untuk beberapa browser)
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = scheme;
                document.body.appendChild(iframe);
                
                // Cleanup iframe
                setTimeout(function() {
                    if (iframe.parentNode) {
                        iframe.parentNode.removeChild(iframe);
                    }
                }, 1000); // Kurangi cleanup time
            }
            
            // Event listeners untuk deteksi app opened
            let startTime = Date.now();
            
            function markAppOpened(source) {
                if (!appOpened) {
                    appOpened = true;
                    console.log('✅ App opened successfully via', source);
                    document.querySelector('.spinner').style.display = 'none';
                    document.querySelector('h2').textContent = 'Opening app...';
                    document.querySelector('p').textContent = 'App is launching, please wait...';
                    document.getElementById('attemptInfo').style.display = 'none';
                }
            }
            
            // Method 1: Visibility change (paling reliable)
            document.addEventListener('visibilitychange', function() {
                if (document.hidden && Date.now() - startTime > 200) { // Kurangi dari 500 ke 200
                    markAppOpened('visibility change');
                }
            });
            
            // Method 2: Window blur  
            window.addEventListener('blur', function() {
                if (Date.now() - startTime > 500) { // Kurangi dari 1000 ke 500
                    markAppOpened('window blur');
                }
            });
            
            // Method 3: Page hide
            window.addEventListener('pagehide', function() {
                markAppOpened('page hide');
            });
            
            // Start app opening process LANGSUNG (tanpa delay)
            console.log('Starting app opening process immediately...');
            openApp(); // Langsung jalankan tanpa setTimeout
            
            // Fallback timeout - show download options (lebih cepat)
            setTimeout(function() {
                if (!appOpened) {
                    console.log('❌ App not opened after 6 seconds, showing fallback');
                    showFailureMessage();
                }
            }, 6000); // Kurangi dari 10000 ke 6000
            
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
