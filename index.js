var restify = require('restify');
var util = require('util');
var uuid = require('node-uuid');
var crypto = require('crypto');
var Game = require("./lib/game_manager.js").GameManager;

var gameStates = {};

var server = restify.createServer({
    name: '2048-as-a-service',
    version: '0.1.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/start', function (req, res, next) {
    var session_id = genSession();
    gameStates[session_id] = new Game(4,2,2048);

    //generate session_id
    var gameState = gameStates[session_id].getState();
    gameState['session_id'] = session_id;

    res.send(gameState);
    return next();

});

server.get('/state/:session_id', function (req, res, next) {

    //Retrieve session_id
    var session_id = req.params.session_id;

    //Get game state from local cache
    var gameState = gameStates[session_id].getState();
    //Success send over
    gameState['session_id'] = session_id;
    res.send(gameState);
    return next();
});

server.get('/state/:session_id/move/:move', function (req, res, next) {

    //Retrieve session_id
    var session_id = req.params.session_id;
    var move = parseInt(req.params.move);

    if(move < 0 || move > 3) {
        res.send(503, new Error('Invalid Move'));
        return next();
    }

    //Get game state from local cache
    var game = gameStates[session_id];
    game.move(move);
    var gameState = game.getState();
    gameState['session_id'] = session_id;

    res.send(gameState);
    return next();
});

server.listen(8080, function () {
    console.log('%s listening at %s', server.name, server.url);
});

function genSession() {
    return crypto.createHash('sha1').update(uuid.v4()).digest('hex');
}
//Catch SIGTERM and SIGINT and uncaughtException for graceful shutdown
process.on( 'SIGTERM', function (err) {
    console.log('ERROR: Caught SIGTERM: ' + err);
    client.quit();
    process.exit(1);
});

process.on( 'SIGINT', function (err) {
    console.log('ERROR: Caught SIGINT: ' + err);
    client.quit();
    process.exit(1);
});

process.on('uncaughtException', function (err) {
    console.log('ERROR: Caught exception: ' + err);
    util.log(err.stack);
});
