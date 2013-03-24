Meteor.methods({
    getTime: function () {
        return new Date().getTime();
    }
});