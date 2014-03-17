var restify = require('restify');
var util = require('util');
var redis = require("redis"),
    client = redis.createClient();
var NodeCache = require("node-cache");
var myCache = new NodeCache({
    stdTTL: 3600,
    checkperiod: 1
});
var uuid = require('node-uuid');
var crypto = require('crypto');
var Game = require("./lib/game_manager.js").GameManager;

var server = restify.createServer({
    name: '2048-as-a-service',
    version: '0.1.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

server.get('/start', function (req, res, next) {
    var game = new Game(4, 2, 2048);
    var gameState = game.getState();

    //generate session_id
    var session_id = genSession();
    gameState['session_id'] = session_id;

    //Cache locally
    myCache.set(session_id, game.serialize(), function (err, success) {
        if (!err && success) {
            //Cache in redis
            client.set(session_id, JSON.stringify(game.serialize()), function (err) {
                if (!err) {
                    client.expire(session_id, 3600);
                    res.send(gameState);
                    return next();
                }
            });
        }
    });

});

server.get('/state/:session_id', function (req, res, next) {

    //Retrieve session_id
    var session_id = req.params.session_id;

    //Get game state from local cache
    myCache.get(session_id, function (err, value) {
        if (!err) {
            // Did not exist in local cache
            if (!("grid" in value)) {
                //Retrieve from redis
                client.get(session_id, function (err, value) {
                    if (!err) {
                        var obj = JSON.parse(value);

                        //Did not exist in redis too
                        if(obj == null) {
                            res.send(404, new Error('Session Does Not Exist.'));
                            return next();
                        }

                        //Load in game session
                        var game = new Game(null, null, null, obj);
                        var gameState = game.getState();
                        gameState['session_id'] = session_id;
                        //Success send over
                        res.send(gameState);
                        return next();
                    }
                });
            } else {
                //Load in game session
                var game = new Game(null, null, null, value);
                var gameState = game.getState();
                //Success send over
                gameState['session_id'] = session_id;
                res.send(gameState);
                return next();
            }
        }
    });
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
    myCache.get(session_id, function (err, value) {
        if (!err) {

            // Did not exist in local cache
            if (!("grid" in value)) {
                //Retrieve from redis
                client.get(session_id, function (err, value) {
                    if (!err) {
                        var obj = JSON.parse(value);


                        //Did not exist in redis too
                        if(obj == null) {
                            res.send(404, new Error('Session Does Not Exist.'));
                            return next();
                        }

                        //Load in game session
                        var game = new Game(null, null, null, obj);
                        //Make the move
                        game.move(move);

                        //Cache locally
                        myCache.set(session_id, game.serialize(), function (err, success) {
                            if (!err && success) {
                                //Cache in redis
                                client.set(session_id, JSON.stringify(game.serialize()), function (err) {
                                    if (!err) {
                                        client.expire(session_id, 3600);
                                        //Get game state
                                        var gameState = game.getState();
                                        gameState['session_id'] = session_id;
                                        //Success send over
                                        res.send(gameState);
                                        return next();
                                    }
                                });
                            }

                        });
                    }
                });
            } else {
                //Load in game session
                var game = new Game(null, null, null, value);
                //Make the move
                game.move(move);

                //Cache locally
                myCache.set(session_id, game.serialize(), function (err, success) {
                    if (!err && success) {
                        //Cache in redis
                        client.set(session_id, JSON.stringify(game.serialize()), function (err) {
                            if (!err) {
                                client.expire(session_id, 3600);
                                //Get game state
                                var gameState = game.getState();
                                gameState['session_id'] = session_id;
                                //Success send over
                                res.send(gameState);
                                return next();
                            }
                        });
                    }
                });
            }
        }
    });
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
