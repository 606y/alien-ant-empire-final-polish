const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'};
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error,data) => { res.writeHead(error ? 404 : 200, {'Content-Type':types[path.extname(file)] || 'text/plain'}); res.end(error ? 'Not found' : data); });
});
const host = process.env.HOST || '0.0.0.0';
server.listen(Number(process.env.PORT || 4173), host, () => console.log(`異星蟻國：http://${host}:${server.address().port}`));
