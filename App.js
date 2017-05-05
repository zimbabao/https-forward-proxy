#!/usr/bin/env node
let parseArgs = require('minimist');
let parsedArgs = parseArgs(process.argv.slice(2));

let Proxy = require('http-mitm-proxy');
let proxy = Proxy();

proxy.onError(function(ctx, err) {
  console.error('HTTPS mitm proxy error : ', err);
});

let httpProxy = require('http-proxy');
let fwdProxy = httpProxy.createProxyServer({});

fwdProxy.on('error', function (err, req, res) {
  res.writeHead(500, { 'Context-Type': 'text/plain' });
  res.end();
  console.error("HTTP forward proxy error :", err);
});

let xfpHeaderNamePrefix = parsedArgs.xfPrefix || 'x-forwarded-';
let targetProxy = parsedArgs.target || 'http://127.0.0.1:3000';

function AddAllHeaders(clientToProxyRequest, headers) {
  if (!headers) return;
  headers = typeof headers === 'string' ? [ headers] : headers;

  headers.forEach((header) => {
    if (!header) return;
    let split = header.split(":");
    if (split.length < 2) return;

    clientToProxyRequest.headers[split[0]] = split[1];
  });
}

function AddXFHeaders(clientToProxyRequest, xfPrefix) {
  clientToProxyRequest.headers[xfPrefix + "for"] = clientToProxyRequest.connection.remoteAddress;
  clientToProxyRequest.headers[xfPrefix + "proto"] = 'https';
}

proxy.onRequest(function(ctx, callback) {
  AddXFHeaders(ctx.clientToProxyRequest, xfpHeaderNamePrefix)
  AddAllHeaders(ctx.clientToProxyRequest, parsedArgs.H);
  fwdProxy.web(ctx.clientToProxyRequest , ctx.proxyToClientResponse, {target: targetProxy})
});

//TODO: Parameterize port, host
proxy.listen({
  port: parsedArgs.port || 3443,
  sslCaDir: "./"
});
