var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use( session({
  secret: 'nyancat',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 600000
  }
}) );

var checkLogin = function (req, res, next) {
  //console.log('session: ', req.session);
  if (req.session.user) {
    // console.log('USER LOGGED IN!');
    next();
  } else {
    req.session.error = 'Access denied!';
    res.redirect('/login');
  }
};

app.get('/login', function (req, res) {
  res.render('login', {error: ''});
});

app.get('/signup', function (req, res) {
  res.render('signup');
});

app.get('/', checkLogin,
function(req, res) {
  res.render('index');
});

app.get('/create', checkLogin,
function(req, res) {
  res.render('index');
});

app.get('/links', checkLogin,
function(req, res) {
  var username = req.session.user;
  new User({ username: username }).fetch()
  .then(function(user) {
    return user.links().fetch();
  })
  .then(function(links) { 
    res.status(200).send(links.models);
  });

  // Links.reset().fetch().then(function(links) {
  //   // console.log('Links models: ', links.models);
  //   res.status(200).send(links.models);
  // });
});

app.post('/links', checkLogin,
function(req, res) {
  var uri = req.body.url;
  var username = req.session.user;

  if (username === undefined) {
    res.sendStatus(404);
  }

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new User({ username: username }).fetch()
  .then(function(user) {

    new Link({ url: uri }).fetch().then(function(link) {
      if (link) {
        user.links().attach(link);
        // attach link to user
        res.status(200).send(link.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.sendStatus(404);
          }

          Links.create({
            url: uri,
            title: title,
            baseUrl: req.headers.origin
          })
          .then(function(newLink) {
            // attach link to user
            user.links().attach(newLink);
            res.status(200).send(newLink);
          });
        });
      }
    });

  });

  
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.post('/signup', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch().then(function(user) {
    if (user) {
      res.redirect('/login');
    } else {
      Users.create({
        username: username,
        password: password
      })
      .then(function(newUser) {
        req.session.user = username;
        res.redirect('/');
        // req.session.regenerate(function() {
        //   req.session.user = newUser.username;
        //   res.redirect('/');
        // });
      });
    }
  });
});

app.post('/login', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username}).fetch().then(function(user) {
    if (user) {
      user.compare(password)
      .then( function(matches) {
        if (matches) {
          req.session.user = username;
          res.redirect('/');
        } else {
          console.log('Password does not match');
          res.render('login', {
            error: 'Password does not match'
          });
        }
      });
    } else {
      console.log('User does not exist');
      res.render('login', {
        error: 'User does not exist'
      });
    }
  });
});

app.get('/logout', function (req, res) {
  if (req.session.user) {
    req.session.destroy(function(err) {
      res.render('logout');
    });
  }
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
