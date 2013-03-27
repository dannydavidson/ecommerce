var db = {}
db.products = new Meteor.Collection("products");
db.clients = new Meteor.Collection("clients");
db.shopsessions = new Meteor.Collection("shopsessions");

if (Meteor.isClient) {

  var ecommerce = {};

  ecommerce.session = null;
  ecommerce.password = 'realtime';

  ecommerce.hideTakeControlBtn = function () {
    $('.take_control_btn').fadeOut('slow', function () {
      $(this).remove();
    });
  }

  ecommerce.transitionToProduct = function (product) {
    var height = $(window).outerHeight();
    var products = db.products.find({}).fetch();
    var product_ids = _.map(products, function (p) {
      return p._id;
    });
    var index = _.indexOf(product_ids, product);
    console.log(product)
    console.log(height);
    console.log(index);
    console.log(product_ids);
    TweenLite.to($(window), .5, {scrollTo:{y: height * index}, ease: Power4.easeOut});
  }

  ecommerce.updateOpen = function (session) {
    $('body').append(Meteor.render(function () {
      return Template.take_control_btn({
        'txt': 'Take Control'
      });
    }));

    $('.take_control_btn').click(function (evt) {
      console.log('take control');
      db.shopsessions.update(ecommerce.session, {'$set': {'speaker': Meteor.userId()}});
    });
  }

  ecommerce.updateWatcher = function (session) {
    ecommerce.hideTakeControlBtn();
    ecommerce.transitionToProduct(session.product);
  }

  ecommerce.updateSpeaker = function (session) {
    ecommerce.hideTakeControlBtn();
    ecommerce.transitionToProduct(session.product);
  }

  ecommerce.enable = function () {
    $('.disabler').remove();
  }

  ecommerce.disable = function () {
    $('body').append('<div class="disabler"></div>');
    $('.disabler').click(function () {
      console.log('silencing click event');
    });
  }

  Meteor.subscribe('products', function() {
    console.log('products are available');
  });

  Meteor.subscribe('shopsessions', function () {
    console.log('shopsessions are available')
  });

  Meteor.subscribe('allUserData', function () {
    console.log('allUserData available')
  });

  Meteor.subscribe('userclient', function () {
    console.log('userclients available')
  })

  Template.chooser.products = function () {
    var products = db.products.find({});
    var s = db.shopsessions.findOne({'default': true});
    if (s) {
      return products.map(function(product) {
        if (product._id == s.product) {
          product.selected = true;
        }
        product.name = _.str.truncate(product.name, 10);
        return product;
      });
    }
    return [true];
  }

  Template.chooser.events({
    'click .chooser_button': function (evt, template) {
      db.shopsessions.update(ecommerce.session, {'$set': {'product': this._id}});
    }
  });

  Template.product_list.products = function () {
    return db.products.find({}).fetch();
  }

  Template.product_list.rendered = function () {
    $('.product_stack').css({
      'height': $(window).height()
    });
  }

  Template.product_stack.events({
    'mousedown .specs': function (evt, template) {
      console.log(this)
    },
    'mousedown .usage': function (evt, template) {
      console.log(this)
    },
    'mousedown .reviews': function (evt, template) {
      console.log(this)
    },
    'mouseup .specs': function (evt, template) {
      console.log(this)
    },
    'mouseup .usage': function (evt, template) {
      console.log(this)
    },
    'mouseup .reviews': function (evt, template) {
      console.log(this)
    },
  });

  Template.controls.isWatcher = function () {
    var s = db.shopsessions.findOne({'default': true});
    if (s) {
      var u = Meteor.userId();
      console.log(u)
      if (u) {
        return (s.speaker && u != s.speaker);
      }
    }
    return false;
  }

  Template.controls.isSpeaker = function () {
    var s = db.shopsessions.findOne({'default': true});
    if (s) {
      var u = Meteor.userId();
      console.log(u)
      if (u) {
        return (s.speaker && u == s.speaker);
      }
    }
    return false;
  }

  Template.controls.handRaised = function () {
    var s = db.shopsessions.findOne({'default': true});
    if (s) {
      var u = Meteor.userId();
      if (u) {
        if (_.contains(s.requesting, u)) {
          return true;
        }
      }
    }
    return false;
  }

  Template.controls.request_control_txt = function () {
    var s = db.shopsessions.findOne({'default': true});
    if (s) {
      var u = Meteor.userId();
      if (u) {
        if (_.contains(s.requesting, u)) {
          return 'Lower hand';
        }
        return 'Raise hand'
      }
    }
  }

  Template.controls.requesting = function () {
    var s = db.shopsessions.findOne({'default': true});
    if (s) {
      console.log(s);
      return _.map(s.requesting, function (uid) {
        console.log(uid);
        return Meteor.users.findOne(uid);
      });
    }
    return [];
  }


  Template.controls.events({
    'click .req_ctrl_btn': function (evt, template) {
      var s = db.shopsessions.findOne({'default': true});
      if (s) {
        var u = Meteor.userId();
        if (u) {
          if (_.contains(s.requesting, u)) {
            db.shopsessions.update(s._id, {'$pull': {'requesting': u}});
          }
          else {
            db.shopsessions.update(s._id, {'$push': {'requesting': u}});
          }
        }
      }
    },
    'click .requester': function (evt, template) {
      var s = db.shopsessions.findOne({'default': true});
      if (s) {
        db.shopsessions.update(s._id, {'$pull': {'requesting': this._id}, '$set': {'speaker': this._id}});
      }
    }
  });


  Deps.autorun(function () {
    var s = db.shopsessions.findOne({'default': true});
    if (s) {
      ecommerce.session = s._id;
      if (!s.speaker) {
        ecommerce.enable();
        ecommerce.updateOpen(s);
      }
      else if (Meteor.userId() != s.speaker) {
        ecommerce.disable();
        ecommerce.updateWatcher(s);
      }
      else {
        ecommerce.enable();
        ecommerce.updateSpeaker(s);
      }
    }
  });

  Deps.autorun(function () {
    var u = Meteor.user();
    if (!u) {
      var user = getParameterByName('user');
      var user_record = Meteor.users.findOne({'username': user});
      console.log(user_record)
      if (user_record) {
        Meteor.loginWithPassword(user_record.username, ecommerce.password);
      }
      else {
        Accounts.createUser({
          'username': user,
          'password': ecommerce.password
        });
      }
    }
    else {
      teamtools.register();
    }
  });

  Accounts.ui.config({
      passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'
  });

}

if (Meteor.isServer) {

  db.shopsessions.allow({
    'insert': function (userId, doc) {
        return true;
    },
    'update': function (userId, docs, fields, modifier) {
        return true;
    },
    'remove': function (userId, docs) {
        return true;
    }
  })


  Meteor.startup(function () {

    teamtools.cleandrops();

    Meteor.publish('userclient', function () {
      return UserClient.find({});
    });

    Meteor.publish('products', function () {
      return db.products.find({});
    });

    Meteor.publish('shopsessions', function() {
      return db.shopsessions.find({'default': true})
    });

    Meteor.publish("allUserData", function () {
      return Meteor.users.find({}, {'fields': {'_id': 1, 'username': 1}});
    });

    var products = [

      {
        'name': 'Awesome Product',
        'img': '/products/product1.jpg',
        'price': '199',
      },
      {
        'name': 'Stellar Product',
        'img': '/products/product2.jpg',
        'price': '199',
      },
      {
        'name': 'Great Product',
        'img': '/products/product4.jpg',
        'price': '199',
      }

    ];

    db.products.remove({});
    _.each(products, function(product) {
      db.products.insert(product);
    });

    var shopsessions = {
      'product': db.products.find({}).fetch()[0]._id,
      'default': true,
      'speaker': null,
      'requesting': []
    }

    db.shopsessions.remove({});
    db.shopsessions.insert(shopsessions);

  });
}
