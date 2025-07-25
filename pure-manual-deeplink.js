const express = require('express');
const app = express();

// Configuration with alternative package names to test
const CONFIG = {
  domain: 'https://elegant-kleicha-42b5e8.netlify.app',
  customScheme: 'bpjstku',
  androidPackage: 'com.bpjstku', // Original package
  alternativePackages: [
    'com.bpjamsostek.mobile', // Alternative package 1
    'id.bpjsketenagakerjaan.mobile', // Alternative package 2
    'com.bpjs.ketenagakerjaan', // Alternative package 3
    'com.bpjstku.mobile' // Alternative package 4
  ],
  iosAppId: '123456789',
  maxRedirectAttempts: 6,
  attemptDelay: 2000
};

app.use(express.json());
app.use(express.static('public'));

// Platform detection helper
function detectPlatform(userAgent) {
  const ua = userAgent.toLowerCase();
  
  // More specific mobile detection
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  
  // Mobile browsers (including mobile Chrome, Safari, etc.)
  if (/mobile/i.test(ua) && !/tablet/i.test(ua)) {
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipod/i.test(ua)) return 'ios';
    // Default mobile to android if unclear
    return 'android';
  }
  
  // Tablet detection
  if (/ipad/i.test(ua) || (/android/i.test(ua) && /tablet/i.test(ua))) {
    return 'tablet';
  }
  
  // Desktop detection
  if (/windows nt/i.test(ua)) return 'windows';
  if (/macintosh|mac os x/i.test(ua)) return 'mac';
  if (/linux/i.test(ua)) return 'linux';
  
  // Bot detection
  if (/bot|crawler|spider|scraper/i.test(ua)) return 'bot';
  
  // Default fallback to android for unknown mobile-like agents
  if (/mobile|phone/i.test(ua)) return 'android';
  
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
                <a href="https://play.google.com/store/apps/details?id=${CONFIG.androidPackage}" class="btn" onclick="updateStatus('Redirecting to Play Store...')">
                    📥 Download BPJSTKU for Android
                </a>
                <a href="https://apps.apple.com/app/id${CONFIG.iosAppId}" class="btn" onclick="updateStatus('Redirecting to App Store...')">
                    🍎 Download BPJSTKU for iOS
                </a>
                <button onclick="simpleAppLaunch()" class="btn" style="background: rgba(0,255,0,0.2); border-color: rgba(0,255,0,0.3);">
                    📱 Test All Packages
                </button>
                <button onclick="testRealPackage()" class="btn" style="background: rgba(255,0,255,0.2); border-color: rgba(255,0,255,0.3);">
                    🔍 Find Real Package
                </button>
                <button onclick="manualRetry()" class="btn" style="background: rgba(255,165,0,0.2); border-color: rgba(255,165,0,0.3);">
                    🔄 Try Again
                </button>
                <button onclick="directAppAttempt()" class="btn" style="background: rgba(0,100,255,0.2); border-color: rgba(0,100,255,0.3);">
                    🚀 Force Launch (Standard Intent)
                </button>
            </div>
        </div>

        <script>
            const strategies = {
                android: [
                    {
                        name: 'Standard App Launch',
                        url: 'intent://#Intent;package=com.bpjstku;end',
                        timeout: 1500
                    },
                    {
                        name: 'MAIN Action Intent',
                        url: 'intent://#Intent;action=android.intent.action.MAIN;package=com.bpjstku;end',
                        timeout: 1500
                    },
                    {
                        name: 'Launcher Intent',
                        url: 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.bpjstku;end',
                        timeout: 1500
                    },
                    {
                        name: 'Package Launch with Fallback',
                        url: 'intent://launch#Intent;package=com.bpjstku;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.bpjstku;end',
                        timeout: 2000
                    },
                    {
                        name: 'Custom Scheme Fallback',
                        url: '${customUrl}',
                        timeout: 1500
                    },
                    {
                        name: 'Market Protocol',
                        url: 'market://details?id=com.bpjstku',
                        timeout: 1500
                    },
                    {
                        name: 'Play Store Direct',
                        url: 'https://play.google.com/store/apps/details?id=com.bpjstku',
                        timeout: 0
                    }
                ],
                ios: [
                    {
                        name: 'Simple iOS Launch',
                        url: '${CONFIG.customScheme}://',
                        timeout: 1000
                    },
                    {
                        name: 'iOS Specific Deep Link',
                        url: '${customUrl}',
                        timeout: 1500
                    },
                    {
                        name: 'Universal Link',
                        url: '${CONFIG.domain}/app/${type}${queryParams ? '?' + new URLSearchParams(queryParams).toString() : ''}',
                        timeout: 2000
                    },
                    {
                        name: 'App Store',
                        url: 'https://apps.apple.com/app/id${CONFIG.iosAppId}',
                        timeout: 0
                    }
                ],
                desktop: [
                    {
                        name: 'Protocol Handler',
                        url: '${customUrl}',
                        timeout: 1000
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
                
                // Debug logging
                console.log('User Agent:', navigator.userAgent);
                console.log('Platform:', navigator.platform);
                console.log('Language:', navigator.language);
                
                // Very aggressive Android detection
                if (/android/i.test(ua)) {
                    console.log('Detected: Android via UA');
                    return 'android';
                }
                
                // Check for mobile indicators that suggest Android
                if (/mobile/i.test(ua) || /phone/i.test(ua)) {
                    console.log('Detected: Mobile device, defaulting to Android');
                    return 'android';
                }
                
                // iOS detection
                if (/iphone|ipad|ipod/i.test(ua)) {
                    console.log('Detected: iOS');
                    return 'ios';
                }
                
                // If touch capability exists on mobile viewport, assume Android
                if ('ontouchstart' in window && window.innerWidth < 1024) {
                    console.log('Detected: Touch mobile device, defaulting to Android');
                    return 'android';
                }
                
                // Last resort: check screen size for mobile
                if (window.screen.width <= 768 || window.innerWidth <= 768) {
                    console.log('Detected: Small screen, defaulting to Android');
                    return 'android';
                }
                
                console.log('Detected: Desktop/Unknown');
                return 'desktop';
            }

            function immediateAppAttempt() {
                const platform = detectUserAgent();
                const customScheme = '${customUrl}';
                
                updateStatus('Platform detected: ' + platform);
                console.log('Starting immediate app attempt for platform:', platform);
                
                // For Android devices, use proper Intent URL formats
                if (platform === 'android') {
                    updateStatus('🤖 Android detected - Trying to launch BPJSTKU...');
                    
                    // Method 1: Standard Android app launch Intent
                    const standardIntent = 'intent://#Intent;package=com.bpjstku;end';
                    console.log('Trying standard Intent:', standardIntent);
                    
                    try {
                        window.location.href = standardIntent;
                    } catch (e) {
                        console.log('Standard Intent failed:', e);
                    }
                    
                    // Method 2: App launch with action MAIN
                    setTimeout(() => {
                        const mainIntent = 'intent://#Intent;action=android.intent.action.MAIN;package=com.bpjstku;end';
                        console.log('Trying MAIN action Intent:', mainIntent);
                        try {
                            window.location.href = mainIntent;
                        } catch (e) {
                            console.log('MAIN Intent failed:', e);
                        }
                    }, 1000);
                    
                    // Method 3: Try with launcher category
                    setTimeout(() => {
                        const launcherIntent = 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.bpjstku;end';
                        console.log('Trying launcher Intent:', launcherIntent);
                        try {
                            window.location.href = launcherIntent;
                        } catch (e) {
                            console.log('Launcher Intent failed:', e);
                        }
                    }, 2000);
                    
                    // Method 4: Direct package launch (alternative format)
                    setTimeout(() => {
                        const packageIntent = 'intent://launch#Intent;package=com.bpjstku;S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.bpjstku;end';
                        console.log('Trying package launch Intent:', packageIntent);
                        try {
                            window.location.href = packageIntent;
                        } catch (e) {
                            console.log('Package launch Intent failed:', e);
                        }
                    }, 3000);
                    
                    // Method 5: If all Intent methods fail, try custom scheme as last resort
                    setTimeout(() => {
                        console.log('Trying custom scheme as fallback:', customScheme);
                        try {
                            window.location.href = customScheme;
                        } catch (e) {
                            console.log('Custom scheme fallback failed:', e);
                        }
                    }, 4000);
                    
                } else if (platform === 'ios') {
                    updateStatus('🍎 iOS detected - Trying to launch BPJSTKU...');
                    
                    console.log('Trying iOS custom scheme:', customScheme);
                    try {
                        window.location.href = customScheme;
                    } catch (e) {
                        console.log('iOS custom scheme failed:', e);
                    }
                    
                } else {
                    updateStatus('💻 Desktop detected - Trying protocol handler...');
                    
                    try {
                        window.location.href = customScheme;
                    } catch (e) {
                        console.log('Protocol handler failed:', e);
                    }
                }
                
                // Start the full fallback process after delay
                setTimeout(attemptAppOpen, 5000);
            }

            async function attemptAppOpen() {
                const platform = detectUserAgent();
                const platformStrategies = strategies[platform] || strategies.android;
                const maxAttempts = Math.min(${CONFIG.maxRedirectAttempts}, platformStrategies.length);
                
                for (let currentAttempt = 0; currentAttempt < maxAttempts; currentAttempt++) {
                    const strategy = platformStrategies[currentAttempt];
                    const attemptNum = currentAttempt + 1;
                    
                    console.log(\`Attempt \${attemptNum}/\${maxAttempts}: \${strategy.name}\`);
                    updateStatus(\`Attempt \${attemptNum}/\${maxAttempts}: \${strategy.name}...\`);
                    updateProgress((attemptNum / maxAttempts) * 100);
                    
                    try {
                        // Create hidden iframe for app schemes
                        if (strategy.name.includes('Scheme') || strategy.name.includes('Intent')) {
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            iframe.src = strategy.url;
                            document.body.appendChild(iframe);
                            
                            // Also try window.location as backup
                            setTimeout(() => {
                                window.location.href = strategy.url;
                            }, 100);
                        } else {
                            // For store links, use direct navigation
                            window.location.href = strategy.url;
                        }
                        
                        // Wait to see if app opens
                        const waitTime = strategy.timeout || ${CONFIG.attemptDelay};
                        if (waitTime > 0) {
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        }
                        
                        // If we're still here and it's not the last attempt, continue
                        if (currentAttempt < maxAttempts - 1 && strategy.timeout > 0) {
                            updateStatus('App not detected, trying alternative method...');
                            console.log('App not opened, continuing to next strategy');
                        }
                        
                        // If this is a store link (timeout = 0), break the loop
                        if (strategy.timeout === 0) {
                            updateStatus('Redirecting to app store for manual installation...');
                            break;
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

            function testRealPackage() {
                updateStatus('🔍 Finding real BPJSTKU package name...');
                
                // Redirect to Play Store to check actual package name
                const playStoreUrl = 'https://play.google.com/store/search?q=bpjstku+bpjs+ketenagakerjaan&c=apps';
                
                updateStatus('Opening Play Store to find BPJSTKU app...');
                
                // Open Play Store search in new tab
                window.open(playStoreUrl, '_blank');
                
                // Show instructions
                setTimeout(() => {
                    updateStatus('📋 Instructions: 1) Find BPJSTKU app in Play Store 2) Check URL for package name 3) Come back and use "Test All Packages"');
                }, 2000);
                
                console.log('User directed to Play Store to find real package name');
            }

            function simpleAppLaunch() {
                updateStatus('📱 Testing multiple package names...');
                const platform = detectUserAgent();
                const simpleScheme = '${CONFIG.customScheme}://';
                
                console.log('Testing multiple packages for platform:', platform);
                
                if (platform === 'android') {
                    // Test with main package first
                    const allPackages = [CONFIG.androidPackage, ...CONFIG.alternativePackages];
                    
                    console.log('Testing packages:', allPackages);
                    
                    allPackages.forEach((packageName, index) => {
                        setTimeout(() => {
                            updateStatus('Testing package: ' + packageName);
                            console.log('Trying package:', packageName);
                            
                            // Method 1: Direct app launch with specific package
                            const packageLaunchIntent = 'intent://launch#Intent;package=' + packageName + ';end';
                            try {
                                window.location.href = packageLaunchIntent;
                                console.log('Launched intent for:', packageName);
                            } catch (e) {
                                console.log('Package launch failed for', packageName, ':', e);
                            }
                            
                        }, index * 1500);
                    });
                    
                    // Also try custom scheme methods
                    setTimeout(() => {
                        updateStatus('Trying custom schemes...');
                        const customSchemes = [
                            '${CONFIG.customScheme}://',
                            'bpjstku://main',
                            'bpjsketenagakerjaan://',
                            'bpjamsostek://',
                            'bpjs://'
                        ];
                        
                        customSchemes.forEach((scheme, index) => {
                            setTimeout(() => {
                                console.log('Trying custom scheme:', scheme);
                                try {
                                    window.location.href = scheme;
                                } catch (e) {
                                    console.log('Custom scheme failed:', scheme, e);
                                }
                            }, index * 500);
                        });
                        
                    }, allPackages.length * 1500 + 1000);
                    
                } else {
                    // For other platforms
                    try {
                        window.location.href = simpleScheme;
                    } catch (e) {
                        console.log('Simple launch failed:', e);
                    }
                }
            }

            function directAppAttempt() {
                updateStatus('🚀 Force launching BPJSTKU with standard Intent formats...');
                const platform = detectUserAgent();
                const customScheme = '${customUrl}';
                
                console.log('Direct app attempt for platform:', platform);
                
                if (platform === 'android') {
                    // Use proper Android Intent URL formats
                    const standardMethods = [
                        // Most standard format - just launch the app
                        'intent://#Intent;package=com.bpjstku;end',
                        // With MAIN action
                        'intent://#Intent;action=android.intent.action.MAIN;package=com.bpjstku;end',
                        // With launcher category
                        'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.bpjstku;end',
                        // Alternative launch format
                        'intent://launch#Intent;package=com.bpjstku;end'
                    ];
                    
                    console.log('Trying standard Android Intent formats...');
                    standardMethods.forEach((method, index) => {
                        setTimeout(() => {
                            console.log('Trying standard method', index + 1, ':', method);
                            updateStatus('Trying Intent format ' + (index + 1) + '/4...');
                            try {
                                window.location.href = method;
                            } catch (e) {
                                console.log('Standard method', index + 1, 'failed:', e);
                            }
                        }, index * 800);
                    });
                    
                    // If standard methods fail, try alternative approaches
                    setTimeout(() => {
                        console.log('Trying alternative methods...');
                        const altMethods = [
                            'market://details?id=com.bpjstku',
                            customScheme
                        ];
                        
                        altMethods.forEach((method, index) => {
                            setTimeout(() => {
                                console.log('Trying alternative method:', method);
                                try {
                                    window.location.href = method;
                                } catch (e) {
                                    console.log('Alternative method failed:', e);
                                }
                            }, index * 500);
                        });
                    }, standardMethods.length * 800 + 1000);
                    
                } else {
                    // For other platforms, try custom scheme
                    try {
                        window.location.href = customScheme;
                    } catch (e) {
                        console.log('Direct app attempt failed:', e);
                    }
                }
            }

            function manualRetry() {
                updateStatus('Retrying app detection...');
                updateProgress(0);
                
                // Clear any existing attempts
                const iframes = document.querySelectorAll('iframe');
                iframes.forEach(iframe => iframe.remove());
                
                // Try again with fresh detection
                setTimeout(immediateAppAttempt, 500);
            }

            // Start immediately when page loads
            window.addEventListener('load', immediateAppAttempt);
            
            // Also start on DOMContentLoaded as backup
            document.addEventListener('DOMContentLoaded', immediateAppAttempt);
            
            // Emergency fallback
            setTimeout(immediateAppAttempt, 100);
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

  // Enhanced logging
  console.log(`[${new Date().toISOString()}] Deep link request:`, {
    type,
    platform,
    userAgent: userAgent.substring(0, 100) + '...',
    queryParams,
    headers: {
      'x-forwarded-for': req.get('X-Forwarded-For'),
      'cf-connecting-ip': req.get('CF-Connecting-IP'),
      'x-real-ip': req.get('X-Real-IP')
    }
  });

  // Special handling for Firebase migration links
  if (type === 'cek-saldo' && queryParams.source === 'firebase') {
    console.log('🔥 Firebase Dynamic Link migration detected for cek-saldo');
  }

  // Enhanced mobile detection
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent);
  const isTablet = /Tablet|iPad/i.test(userAgent);
  
  console.log(`Detection results: platform=${platform}, isMobile=${isMobile}, isTablet=${isTablet}`);

  // Handle bot/crawler requests
  if (platform === 'bot') {
    console.log('Serving bot/crawler page');
    return res.send(generateSocialMetaPage(type, queryParams));
  }

  // For mobile devices, always serve smart redirect page
  if (isMobile || platform === 'android' || platform === 'ios') {
    console.log('Serving mobile smart redirect page');
    return res.send(generateSmartRedirectPage(type, queryParams));
  }

  // Handle desktop requests
  if (platform === 'windows' || platform === 'mac' || platform === 'linux') {
    console.log('Serving desktop page');
    return res.send(generateDesktopPage(type, queryParams));
  }

  // Default to mobile smart redirect
  console.log('Default serving mobile smart redirect page');
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
