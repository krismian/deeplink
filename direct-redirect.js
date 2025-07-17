// Server-side direct redirect endpoint
app.get('/r/:type/direct', (req, res) => {
  const { type } = req.params;
  const userAgent = req.get('User-Agent') || '';
  
  // Ambil semua query parameters dari URL
  const queryParams = req.query;
  const queryString = Object.keys(queryParams).length > 0 
    ? '?' + new URLSearchParams(queryParams).toString() 
    : '';
  
  // Detect platform
  const isAndroid = /Android/.test(userAgent);
  
  let redirectUrl;
  
  if (isAndroid) {
    // Android: Custom scheme
    if (queryString) {
      redirectUrl = `bpjstku://${type}${queryString}`;
    } else {
      redirectUrl = `bpjstku://${type}`;
    }
  } else {
    // iOS atau platform lain
    if (queryString) {
      redirectUrl = `bpjstku://${type}${queryString}`;
    } else {
      redirectUrl = `bpjstku://${type}`;
    }
  }
  
  console.log('Direct server redirect to:', redirectUrl);
  
  // Server-side redirect langsung tanpa HTML
  res.redirect(302, redirectUrl);
});
