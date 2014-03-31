//TODO:
//0. Safety checks (done)
//1. Add timeout to clear out expired game states (done)
//2. Check for valid session ids (done)
//3. IP based throttling (done)
//4. Thanks REST (done)
//5. Error codes (done)
//6. Redirect after start/ to state: (done)
//7. Beautify function (done)
//8. Mod the game (done). 
//9. Quotes (done)
//10. bunyan logging
//11. params -max_games, -timeout
//12. testing
//13. Update docs

var restify = require('restify');
var util = require('util');
var uuid = require('node-uuid');
var crypto = require('crypto');
var Game = require("./lib/game_manager.js").GameManager;
var starwars = require('starwars');
var Table = require('cli-table');

var gameStates = {};
var MAX_GAMES = 200000;
var TIMEOUT = 300;
var gameCount = 0;

var server = restify.createServer({
    name: '2048-as-a-service',
    version: '0.1.0'
});
server.use(
    restify.throttle({
        burst: 100,
        rate: 50,
        xff: true,
   })
);
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

//Check if client has thanked you
//Obey ZEST principles
server.pre(function(req, res, next) {
    if(!((req.url).match(/\/thanks$/))) {
        console.log("No thanks...");
        res.send(800, new Error('Please say thanks...'));
        return next();
    }
    return next();
});

function startGame(req, res, next) {
    if(gameCount > MAX_GAMES) {
        res.send(503, new Error('2048-as-a-service is running at max capacity. Sorry about that! Please try again in 5 minutes.'));
        return next();
    }
    var session_id = genSession();

    //Default game params
    var size = 4;
    var tiles = 2;
    var victory = 11;
    var rand = 4;

    //Custom game
    if((req.url).match(/\/size\//)) {
        size = parseInt(req.params.size);
        tiles = parseInt(req.params.tiles);
        victory = parseInt(req.params.victory);
        rand = parseInt(req.params.rand);

        if(size < 3 || size > 16) {
            res.send(503, new Error('Size can only be between 3 and 16.'));
            return next();
        }
        if(tiles < 0 || tiles > (size*size/2)) {
            res.send(503, new Error('Number of intial tiles can only be between 1 to size^2/2'));
            return next();
        }
        if(victory <= rand || victory > 32) {
            res.send(503, new Error('Victory power cannot be smaller than or equal to rand or be greater than 32'));
            return next();
        }
        if(move < 0 || move > victory) {
            res.send(503, new Error('Rand tiles has to be greater than 1 or less than victory'));
            return next();
        }
    }

    gameStates[session_id] = new Game(size,tiles,victory,rand);

    var json = '';
    if((req.url).match(/\/json\//)) {
        json = '/json';
    }

    res.header('Location', '/state/' + session_id + json + '/thanks');
    res.send(302);
    return next();
}


function gameMove(req,res,next) {
    var session_id = req.params.session_id;

    //Check if session id exists
    if(!(session_id in gameStates)) {
        res.send(503, new Error('Invalid session id or session id has already expired.'));
        return next();
    }

    //Get game state from local cache
    var game = gameStates[session_id];

    //Check if move parameter was defined
    if(!(typeof req.params.move === "undefined")) {
        var move = parseInt(req.params.move);
        if(move < 0 || move > 3) {
            res.send(503, new Error('Invalid Move'));
            return next();
        }
        game.move(move);
    }

    var gameState = game.getState();
    gameState['session_id'] = session_id;
    gameState['inspiration'] = starwars();

    var table = new Table({
        chars: { 'top': '═' , 'top-mid': '╤' , 'top-left': '╔' , 'top-right': '╗'
         , 'bottom': '═' , 'bottom-mid': '╧' , 'bottom-left': '╚' , 'bottom-right': '╝'
         , 'left': '║' , 'left-mid': '╟' , 'mid': '─' , 'mid-mid': '┼'
         , 'right': '║' , 'right-mid': '╢' , 'middle': '│' }
    });

    for(var i in gameState['grid']) {
        table.push(gameState['grid'][i]);
    }

    var str = 'Session ID: ' + session_id +  '\n';
    str += 'Overall Score: ' + gameState['score'] +  '\n\n';
    str += 'Grid:\n' + table.toString() + '\n\n';
    str += 'Inspiration:\n' + gameState['inspiration'] + '\n';
    console.log(str);

    //JSON request, so send the gameState object
    if((req.url).match(/\/json\//)) {
        res.send(gameState);
        return next();
    }

    res.contentType = 'text';
    res.send(str);
    return next();
}

//Routes
server.get('/start/thanks', startGame);
server.get('/start/json/thanks', startGame);
server.get('/start/size/:size/tiles/:tiles/victory/:victory/rand/:rand/thanks', startGame);
server.get('/start/size/:size/tiles/:tiles/victory/:victory/rand/:rand/json/thanks', startGame);

server.get('/state/:session_id/thanks',gameMove);
server.get('/state/:session_id/move/:move/thanks',gameMove);
server.get('/state/:session_id/json/thanks',gameMove);
server.get('/state/:session_id/move/:move/json/thanks',gameMove);

server.get('/inspiration/thanks', function (req, res, next) {
    var msg = {};
    msg['inspiration'] = starwars();
    res.send(obj);
    return next();
});

server.listen(8080, function () {
    console.log('%s listening at %s', server.name, server.url);
});

function genSession() {
    gameCount++;
    return crypto.createHash('sha1').update(uuid.v4()).digest('hex');
}

//Delete all game sessions that were inactive for 5 minutes
function clearInactiveGames() {
    var curTime = Math.round(+new Date()/1000);
    for(var game_session in gameStates){
        var game = gameStates[game_session];
        if(game.getLastActive() < (curTime - TIMEOUT)) {
            //Hackish way of keeping count
           gameCount--;
           delete gameStates[game_session];
        }
    }
}

setInterval (clearInactiveGames, TIMEOUT*100);

//Catch SIGTERM and SIGINT and uncaughtException for graceful shutdown
process.on( 'SIGTERM', function (err) {
    console.log('ERROR: Caught SIGTERM: ' + err);
    process.exit(1);
});

process.on( 'SIGINT', function (err) {
    console.log('ERROR: Caught SIGINT: ' + err);
    process.exit(1);
});

process.on('uncaughtException', function (err) {
    console.log('ERROR: Caught exception: ' + err);
    util.log(err.stack);
});
