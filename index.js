var restify = require('restify');

var server = restify.createServer({
  name: '2048-as-a-service',
  version: '0.1.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/start', function (req, res, next) {
  res.send(req.params);
  return next();
});

server.get('/state/:session_id', function (req, res, next) {
  res.send(req.params);
  return next();
});

server.get('/state/:session_id/move/:move', function (req, res, next) {
  res.send(req.params);
  return next();
});

server.listen(8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});

