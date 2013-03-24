var UserClient = new Meteor.Collection('userclient');

UserClient.allow({
    'insert': function (userId, doc) {
        return true;
    },
    'update': function (userId, docs, fields, modifier) {
        return true;
    },
    'remove': function (userId, docs) {
        return true;
    }
});

var teamtools = {};

teamtools.interval = 1000;
teamtools.counter = 0;
teamtools.latency = 0;
teamtools.sync_frequency = 4;
teamtools.drop_buffer = 2000;


teamtools.register = function () {
    var start_call = new Date().getTime();
    Meteor.call('getTime', function (err, result) {
        teamtools.latency = new Date().getTime() - start_call;
        teamtools.time = result;
        teamtools.id = Meteor.uuid();
        teamtools._ping();
        teamtools.register.handle = Meteor.setInterval(teamtools._ping, teamtools.interval);
    });
}

teamtools.unregister = function () {
    Meteor.clearInterval(teamtools.register.handle);
}

teamtools.cleandrops = function () {
    teamtools.cleandrops.handle = Meteor.setInterval(teamtools._scandrops, teamtools.interval);
}

teamtools.unwatchdrops = function () {
    Meteor.clearInterval(teamtools.watchdrops.handle);
}

teamtools._ping = function () {
    teamtools.counter++;
    if (teamtools.counter % teamtools.sync_frequency == 0) {
        // if nth loop without time update
        var start_call = new Date().getTime();
        Meteor.call('getTime', function (err, result) {
            teamtools.latency = new Date().getTime() - start_call;
            teamtools.time = result
        });
    }
    else {
        // update time
        teamtools.time = teamtools.time + teamtools.interval;
    }

    // write timestamp to userclient
    if (Meteor.user()) {
        var clients = UserClient.find({'id': teamtools.id}, {'fields': {'_id': 1}}).fetch();
        if (_.isArray(clients) && clients.length > 0) {
            _.each(clients, function (client) {
                UserClient.update(
                    client._id, 
                    {'$set': {'last_ping': teamtools.time, 'latency': teamtools.latency, 'user': Meteor.userId()}})
            });
        } 
        else {
            UserClient.insert({'id': teamtools.id, 'last_ping': teamtools.time, 'latency': teamtools.latency, 'user': Meteor.userId()});
        }
    }
}


teamtools._scandrops = function () {
    var time = Meteor.call('getTime');
    var clients = UserClient.find({})
    _.each(clients.fetch(), function (item) {
        var t = time - teamtools.interval - item.latency - teamtools.drop_buffer;
        if (item.last_ping <= t) {
            UserClient.remove({'_id': item._id});
            // this is where we'll have our plugin functions for cleanups on disconnect
            var session = db.shopsessions.findOne({'default': true});
            if (session) {
                if (item.user == session.speaker) {
                    db.shopsessions.update({'_id': session._id}, {'$set': {'speaker': null}});
                }
                else if (_.contains(session.requesting, item.user)) {
                    db.shopsessions.update({'_id': session._id}, {'$set': {'requesting': _.without(session.requesting, item.user)}})
                }
            }
        }
    });
}