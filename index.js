"use strict";
const httpstat = require('httpstat');

const newResponse = (error, statusCode, bodySize, latency) => ({
  error: error,
  status: statusCode,
  body: bodySize,
  latency: latency,
});

exports.latency = (req, res) => {
  if (req.query.url === undefined || req.query.method === undefined) {
    return res.status(400).end();
  }
  const url = req.query.url;
  const body = req.query.body;
  const q = {
    method: req.query.method,
    timeout: req.query.timeout ? parseInt(req.query.timeout) : 10000,
    headers: req.query.headers ? JSON.parse(req.query.headers) : {},
  };

  let timeout = setTimeout(() => {
    timeout = null;
      res.json(newResponse('TIMEOUT', -1, -1, {})).end();
  }, 1 + q.timeout);

  httpstat(url, q, body).then(result => {
    if (timeout === null) return;
    clearTimeout(timeout);
    const statusCode = result.response.statusCode;
    const bodySize = result.response.body.length;
    const proto = result.url.protocol;
    const time = result.time;
    const latency = {
      dns: time.onLookup - time.begin,
      tcp: time.onConnect - time.onLookup,
      tls: time.onSecureConnect - time.onConnect,
      server: time.onTransfer - (proto === 'https:' ? time.onSecureConnect : time.onConnect),
      transfer: time.onTotal - time.onTransfer,
    };
    if (proto === 'http:') {
      delete latency.tls;
    }

    res.json(newResponse("", statusCode, bodySize, latency)).end();
  }).catch(e => {
    if (timeout === null) return;
    clearTimeout(timeout);
    console.error(e);
    res.json(newResponse(e.toString(), -1, -1, {})).end();
  })
};
