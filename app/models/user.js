var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link');


var User = db.Model.extend({
  tableName: 'users',
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      return new Promise(function(resolve, reject) {
        bcrypt.hash(model.attributes.password, bcrypt.genSaltSync(1), null, function(err, hash) {
          if ( err ) { reject(err); }
          model.set('password', hash);
          resolve(hash); // data is created only after this occurs
        });
      });
    }, this);
  },

  compare: function(password) {
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, this.get('password'), function (err, matches) {
        if (err) { reject(err); }
        resolve(matches);
      });
      // bcrypt.hash(password, bcrypt.genSaltSync(1), null, (err, hash) => {
      //   if ( err ) { reject(err); }
      //   console.log("stored password: ", this.get('password'));
      //   console.log("newly hashed: ", hash);
      //   resolve(this.get('password') === hash);
      // });
    });
  },
  links: function() {
    return this.belongsToMany(Link);
  }
});


module.exports = User;