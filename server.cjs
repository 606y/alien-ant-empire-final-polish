
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname;
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ogg':'audio/ogg','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}
  catch{res.writeHead(400);res.end();return;}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const type=types[path.extname(file)]||'text/plain';
  if(path.extname(file)==='.mp4'){
    fs.stat(file,(error,stat)=>{
      if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}
      const size=stat.size,range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range||'');
      let start=0,end=size-1,status=200;
      if(range){
        start=range[1]?Number(range[1]):Math.max(0,size-Number(range[2]));
        end=range[1]?(range[2]?Number(range[2]):size-1):size-1;
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start){res.writeHead(416,{'Content-Range':'bytes */'+size});res.end();return;}
        end=Math.min(end,size-1);status=206;
      }
      const headers={'Content-Type':type,'Content-Length':end-start+1,'Accept-Ranges':'bytes'};
      if(status===206)headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
      res.writeHead(status,headers);
      if(req.method==='HEAD'){res.end();return;}
      fs.createReadStream(file,{start,end}).pipe(res);
    });return;
  }
  fs.readFile(file,(error,data)=>{
    res.writeHead(error?404:200,{'Content-Type':type});
    res.end(error?'Not found':req.method==='HEAD'?'':data);
  });
});
const host=process.env.HOST||'0.0.0.0';
server.listen(Number(process.env.PORT||4173),host,()=>console.log('異星蟻國：http://'+host+':'+server.address().port));
