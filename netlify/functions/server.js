const express = require('express');
const serverless = require('serverless-http');

const app = express();

// Configuration  
const CONFIG = {
  // Firebase config (keep for backward compatibility)
  firebaseDomain: 'https://individual-engagement-3.web.app',
  
  // Official BPJS Firebase domain (for reference)
  officialFirebaseDomain: 'https://bpjsketenagakerjaan.page.link',
  
  // App config (VERIFIED - same as official BPJS)
  androidPackage: 'com.bpjstku', // ✅ CONFIRMED - matches official BPJS
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

// Main redirect endpoint - FIREBASE DYNAMIC LINK STRATEGY
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
    source: referer.includes('firebase') ? 'firebase' : 'manual',
    officialComparison: `Official BPJS equivalent: ${CONFIG.officialFirebaseDomain}/${type}`
  });
  
  if (isBot) {
    return res.send(generateBotResponse(type));
  }
  
  // NEW STRATEGY: Generate Firebase Dynamic Link and redirect to it
  if (isMobile) {
    // Generate Firebase Dynamic Link dengan parameter yang akan diteruskan ke app
    const targetUrl = `${CONFIG.ownDomain}/app/${type}${queryString}`; // URL yang akan dibuka di app
    
    // Firebase Dynamic Link format (sama seperti official BPJS structure)
    const firebaseLink = `${CONFIG.firebaseDomain}/?` + 
      `link=${encodeURIComponent(targetUrl)}` +
      `&apn=${CONFIG.androidPackage}` + // ✅ VERIFIED: same as official BPJS
      `&ibi=${CONFIG.iosBundleId}` +
      `&isi=${CONFIG.iosAppId}`;
    
    console.log('Generated Firebase Link:', firebaseLink);
    console.log('Official BPJS equivalent would be:', `${CONFIG.officialFirebaseDomain}/${type}`);
    
    // Direct redirect ke Firebase Dynamic Link (same strategy as official BPJS)
    return res.redirect(302, firebaseLink);
  } else {
    // Desktop users - show web version with app promotion
    return res.send(generateDesktopResponse(type));
  }
});

// App endpoint - untuk handle Firebase Dynamic Link redirect
app.get('/app/:type', (req, res) => {
  const { type } = req.params;
  const userAgent = req.get('User-Agent') || '';
  
  // Ambil semua query parameters dari URL
  const queryParams = req.query;
  const queryString = Object.keys(queryParams).length > 0 
    ? '?' + new URLSearchParams(queryParams).toString() 
    : '';
  
  // Log untuk analytics
  console.log('App endpoint called:', {
    type, 
    queryParams,
    queryString,
    userAgent: userAgent.slice(0, 100),
    note: 'This should be handled by Firebase SDK in app'
  });
  
  // Jika endpoint ini dipanggil di browser (bukan di app), show instruction
  return res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>BPJSTKU - ${type}</title>
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
            .info {
                background: rgba(255, 255, 255, 0.1);
                padding: 30px;
                border-radius: 15px;
                margin: 20px auto;
                max-width: 400px;
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
            }
        </style>
    </head>
    <body>
        <h1>BPJSTKU App Content</h1>
        <div class="info">
            <h3>📱 ${type.charAt(0).toUpperCase() + type.slice(1)}</h3>
            <p>This content is designed to be viewed in the BPJSTKU mobile app.</p>
            <p><strong>Parameters:</strong> ${queryString || 'none'}</p>
            <br>
            <p>If you're seeing this in a browser, please:</p>
            <ol style="text-align: left;">
                <li>Open the BPJSTKU app on your device</li>
                <li>Or download the app from the store</li>
            </ol>
        </div>
        
        <div>
            <a href="${CONFIG.playStoreUrl}" class="btn">Download Android App</a>
            <a href="${CONFIG.appStoreUrl}" class="btn">Download iOS App</a>
        </div>
        
        <div style="margin-top: 30px; font-size: 12px; opacity: 0.7;">
            <p>App endpoint: /app/${type}${queryString}</p>
            <p>This URL should be handled by Firebase SDK in your app</p>
        </div>
    </body>
    </html>
  `);
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
            console.log('Fallback scheme:', '${fallbackScheme || 'N/A'}');
            console.log('User Agent:', navigator.userAgent);
            console.log('Current URL:', window.location.href);
            
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
                        // Android: Coba custom scheme dulu
                        console.log('Android attempt 1 - custom scheme:', '${primaryScheme}');
                        tryOpenApp('${primaryScheme}');
                    } else if (attempts === 2) {
                        // Android: Coba custom scheme lagi (kadang perlu 2x)
                        console.log('Android attempt 2 - custom scheme retry:', '${primaryScheme}');
                        tryOpenApp('${primaryScheme}');
                    } else if (attempts === 3) {
                        // Android: Baru sekarang coba Intent URL
                        console.log('Android attempt 3 - Intent URL:', '${fallbackScheme}');
                        tryOpenApp('${fallbackScheme}');
                    } else {
                        // Final fallback - show error message
                        console.log('Android attempt 4 - Show error message');
                        showFailureMessage();
                        return;
                    }
                } else if (${isIOS}) {
                    if (attempts === 1) {
                        // iOS: Custom scheme
                        console.log('iOS attempt 1 - custom scheme:', '${primaryScheme}');
                        tryOpenApp('${primaryScheme}');
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
                
                // Retry setelah interval yang lebih cepat
                if (attempts < 4) { // Android ada 4 attempts
                    const retryDelay = 1000; // 1 detik untuk semua attempts (lebih cepat)
                    setTimeout(openApp, retryDelay);
                }
            }
            
            function updateAttemptInfo(attemptNum) {
                const attemptInfo = document.getElementById('attemptInfo');
                const attemptDetails = document.getElementById('attemptDetails');
                
                attemptInfo.style.display = 'block';
                
                if (${isAndroid}) {
                    if (attemptNum === 1) {
                        attemptDetails.innerHTML = 'Step 1/4: Trying custom app scheme (iframe)...';
                    } else if (attemptNum === 2) {
                        attemptDetails.innerHTML = 'Step 2/4: Trying custom app scheme (direct)...';
                    } else if (attemptNum === 3) {
                        attemptDetails.innerHTML = 'Step 3/4: Trying Android Intent URL...';
                    } else {
                        attemptDetails.innerHTML = 'Step 4/4: All methods failed, showing options...';
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
            
            function tryOpenApp(scheme) {
                console.log('Trying to open app with scheme:', scheme);
                
                // Method: Direct window.location.href (paling simple dan reliable)
                try {
                    window.location.href = scheme;
                    console.log('Direct redirect attempted to:', scheme);
                } catch (e) {
                    console.log('Direct scheme failed:', e.message);
                }
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
                if (document.hidden && Date.now() - startTime > 100) { // Lebih cepat lagi: 100ms
                    markAppOpened('visibility change');
                }
            });
            
            // Method 2: Window blur  
            window.addEventListener('blur', function() {
                if (Date.now() - startTime > 300) { // Lebih cepat: 300ms
                    markAppOpened('window blur');
                }
            });
            
            // Method 3: Focus change
            window.addEventListener('focus', function() {
                // Jika kembali focus dalam waktu singkat, berarti app tidak terbuka
                if (Date.now() - startTime < 1000 && attempts > 0) {
                    console.log('Window regained focus quickly, app might not have opened');
                }
            });
            
            // Method 3: Page hide
            window.addEventListener('pagehide', function() {
                markAppOpened('page hide');
            });
            
            // Start app opening process LANGSUNG (tanpa delay)
            console.log('Starting app opening process immediately...');
            openApp(); // Langsung jalankan tanpa setTimeout
            
            // Fallback timeout - show download options (lebih cepat lagi)
            setTimeout(function() {
                if (!appOpened) {
                    console.log('❌ App not opened after 5 seconds, showing fallback');
                    showFailureMessage();
                }
            }, 5000); // Kurangi ke 5000 untuk testing lebih cepat
            
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
