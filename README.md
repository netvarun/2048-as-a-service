2048-as-a-service
=================

Build powerful 2048 gameplay apps with our simple 2048-as-a-service API.
Integrate 2048-functionality into your bash scripts, SoLoMo (social-local-mobile) apps and
internet-of-things devices!


# The API


## GET /start

Start a new game session and returns a `session_id`.
All sessions last a maximum of 1 hour.


#### example request

    $ curl {{localhost}}/start


## GET /state/:session_id

Get the current game board state for the specified `session_id`.


#### example request

    $ curl {{localhost}}/state/5a16a6cf460e84e2f6c581bcf68e719e40ef671e

Responds with **404** if `:session_id` does not exist


## GET /state/:session_id/move/:move

The actual gameplay functionality.
`:session_id` is the session id of the game that you got when you started the game.
`:move` is the next move entered by the user.

There are 4 possible values for `:move`:

`0` for UP
`1` for RIGHT
`2` for DOWN
`3` for LEFT

#### example request

    $ curl {{localhost}}/state/5a16a6cf460e84e2f6c581bcf68e719e40ef671e/move/1

Responds with **404** if `session_id` does not exist
Responds with **501** if invalid `:move` specified

Game will terminate with either a 'You Won' or a 'You Lost' message, after which
`session_id` will no longer be valid.


#Credits

2048 was created by [Gabriele Cirulli](http://gabrielecirulli.com). Based on [1024 by Veewo Studio](https://itunes.apple.com/us/app/1024!/id823499224) and conceptually similar to [Threes by Asher Vollmer](http://asherv.com/threes/).

This was a random weekend project by [Sivamani Varun](http://www.netvarun.com/) and Srinivas Kidambi.
The heart of this project is the 2048 game engine, which was extracted from the original 2048 with some modifications.

#License
MIT

