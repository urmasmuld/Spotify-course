/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '3b10c3403226433ea08d45e47c9a5894'; // Your client id
var client_secret = '0b0506dc3b0b453db1b1cf20ec9ce3ab'; // Your secret
var redirect_uri = 'http://localhost:3000/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private playlist-read-private playlist-read-collaborative';

res.redirect('https://accounts.spotify.com/authorize?' +
  querystring.stringify({
    response_type: 'code',
    client_id: client_id,
    scope: scope,
    redirect_uri: redirect_uri,
    state: state
  }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

app.get('/createPlaylist', function(req, res) {
  async function createPlaylist() {
      request.post(
          'https://api.spotify.com/v1/users/' + req.query.user_id + '/playlists',
          {
            headers: { 
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + req.query.access_token
            },
          json: {
              name: req.query.name,
              description: req.query.description,
              public: req.query.public
          }
          },
          function (error, response, body) {
            if (!error && response.statusCode == 200) {
              console.log(body);
            }
          }
      );
      res.send({
        message: 'Playlist "' + req.query.name + '" created.'
      });  
    }
  createPlaylist();
});

app.get('/getPlaylists', function(req, res) {
  async function getPlaylist() {
    request.get(
          'https://api.spotify.com/v1/users/' + req.query.user_id + '/playlists',
          {
            headers: { 
              "Accept": "application/json",
              "Authorization": "Bearer " + req.query.access_token
            }
          },
          function (error, response, body) {
            if (!error && response.statusCode == 200) {
              res.send(body);
            }
          }
      );
    }
    getPlaylist();
});

app.get('/getPlaylistItems', function(req, res) {
  async function getPlaylistItems() {
    // console.log(req.query.id);
    // console.log(req.query.access_token);
    request.get(
          'https://api.spotify.com/v1/playlists/' + req.query.id + '/tracks',
          {
            headers: { 
              "Accept": "application/json",
              'Content-Type': 'application/json',
              "Authorization": "Bearer " + req.query.access_token
            }
          },
          function (error, response, body) {
            if (!error && response.statusCode == 200) {
              res.send(body);
            }
          }
      );
    }
    getPlaylistItems();
});

app.get('/delPlaylistItem', function(req, res) {
  console.log('album_id: ' + req.query.album_id);
  console.log('track_id: ' + req.query.track_id);
  console.log('token: ' + req.query.access_token);

  async function delPlaylistItem() {
    request.delete(
          'https://api.spotify.com/v1/playlists/' + req.query.album_id + '/tracks',
          {
            headers: { 
              "Accept": "application/json",
              'Content-Type': 'application/json',
              "Authorization": "Bearer " + req.query.access_token
            },
            json: { tracks: [{ "uri": "spotify:track:"+ req.query.track_id}] }
          },
          function (error, response, body) {
            if (!error && response.statusCode == 200) {
              // console.log(body);
              res.send(body);
            }
          }
      );
    }
    delPlaylistItem();
});

console.log('Listening on 3000');
console.log('http://localhost:3000');
app.listen(3000);
