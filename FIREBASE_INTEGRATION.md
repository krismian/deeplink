# 🔥 Firebase Dynamic Link Integration - BPJSTKU App

## 📋 **Overview**
Sistem deep linking sekarang menggunakan **Firebase Dynamic Links** secara penuh untuk kompatibilitas dengan Firebase SDK yang sudah ada di aplikasi Android BPJSTKU.

## 🚀 **How It Works**

### **1. URL Flow**
```
User clicks: https://elegant-kleicha-42b5e8.netlify.app/r/cek-saldo?param=value
      ↓
Server generates: https://individual-engagement-3.web.app/?link=https%3A//elegant-kleicha-42b5e8.netlify.app/app/cek-saldo%3Fparam%3Dvalue&apn=com.bpjstku&ibi=...
      ↓
Firebase processes and opens app with: https://elegant-kleicha-42b5e8.netlify.app/app/cek-saldo?param=value
      ↓
App Firebase SDK handles the URL
```

### **2. App URL Structure**
Aplikasi akan menerima URL dengan format:
```
https://elegant-kleicha-42b5e8.netlify.app/app/{type}?{parameters}
```

**Examples:**
- `https://elegant-kleicha-42b5e8.netlify.app/app/cek-saldo`
- `https://elegant-kleicha-42b5e8.netlify.app/app/cek-saldo?userId=123&action=view`
- `https://elegant-kleicha-42b5e8.netlify.app/app/bayar-iuran?amount=50000&method=bca`

## 📱 **App Integration**

### **Android - Firebase SDK**
Di aplikasi Android, pastikan Firebase SDK sudah dikonfigurasi untuk handle dynamic links:

```kotlin
// Existing Firebase initialization in your app
FirebaseDynamicLinks.getInstance()
    .getDynamicLink(intent)
    .addOnSuccessListener(this) { pendingDynamicLinkData ->
        var deepLink: Uri? = null
        if (pendingDynamicLinkData != null) {
            deepLink = pendingDynamicLinkData.link
            handleAppUrl(deepLink.toString())
        }
    }

// Parse the app URL
private fun handleAppUrl(url: String) {
    // URL format: https://elegant-kleicha-42b5e8.netlify.app/app/{type}?{params}
    val uri = Uri.parse(url)
    val pathSegments = uri.pathSegments
    
    if (pathSegments.size >= 2 && pathSegments[0] == "app") {
        val type = pathSegments[1] // "cek-saldo", "bayar-iuran", etc.
        val params = parseQueryParameters(uri)
        
        when (type) {
            "cek-saldo" -> navigateToCekSaldo(params)
            "bayar-iuran" -> navigateToBayarIuran(params)
            // Add more navigation cases
        }
    }
}

private fun parseQueryParameters(uri: Uri): Map<String, String> {
    val params = mutableMapOf<String, String>()
    for (paramName in uri.queryParameterNames) {
        params[paramName] = uri.getQueryParameter(paramName) ?: ""
    }
    return params
}
```

## 🧪 **Testing URLs**

### **Production URLs** 
```
https://elegant-kleicha-42b5e8.netlify.app/r/cek-saldo
https://elegant-kleicha-42b5e8.netlify.app/r/cek-saldo?userId=123&action=view
https://elegant-kleicha-42b5e8.netlify.app/r/bayar-iuran?amount=50000&method=bca
```

### **Direct App URLs (for testing in browser)**
```
https://elegant-kleicha-42b5e8.netlify.app/app/cek-saldo
https://elegant-kleicha-42b5e8.netlify.app/app/cek-saldo?userId=123&action=view
```

## 🔧 **Configuration**

### **Current Firebase Config**
```javascript
{
  firebaseDomain: 'https://individual-engagement-3.web.app',
  androidPackage: 'com.bpjstku',
  iosBundleId: 'com.yourapp.ios', // Update if needed
  iosAppId: 'YOUR_IOS_APP_ID'     // Update if needed
}
```

## ✅ **Benefits**

1. **✅ Full Compatibility** - Works with existing Firebase SDK in app
2. **✅ No Custom Schemes** - No need for `bpjstku://` scheme registration
3. **✅ Parameter Preservation** - All URL parameters are preserved
4. **✅ Automatic Generation** - Firebase Dynamic Links generated on-the-fly
5. **✅ Fallback Handling** - If app not installed, shows download page
6. **✅ No App Updates** - Works with current app without any changes

## 🚨 **Important Notes**

1. **App URL Pattern**: App will receive URLs starting with `/app/` instead of custom schemes
2. **Parameter Handling**: All query parameters from original URL are preserved
3. **Firebase Domain**: Uses existing Firebase project `individual-engagement-3.web.app`
4. **Backward Compatibility**: Old Firebase Dynamic Links still work
5. **No Breaking Changes**: Existing app code should continue working

## 📞 **Support**

Jika ada pertanyaan atau perlu penyesuaian configuration, kontak developer untuk:
- Update iOS bundle ID dan App ID
- Tambah type URL baru
- Modify parameter handling
- Testing dan debugging
