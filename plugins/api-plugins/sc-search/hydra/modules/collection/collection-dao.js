/**
 * Dao layer which actually gets file from the datastore
 *
 * @type {exports}
 */
var Boom = require('boom'),
  dbconfig = require('../../../../../../config/db');

var Mongoose = dbconfig.Mongoose,
  Schema = Mongoose.Schema;

var userCollections = new Mongoose.Schema({
  /**
  * Collection ID
  */
  cid: {
    type: String,
    unique: true,
    required: true
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String
  },

  author: {
    type: String,
    required: true
  },

  tags: [String],

  /**
  * Meta Ids: Pointers to datasets that are part of the collection
  */
  meta_ids: [String],

  /**
  * SocialCops MetaData: Put whatever extra information you want here.
  */
  _scmd: Schema.Types.Mixed

});

var Users = dbconfig.db.collection('users'),
  UserCollections = Mongoose.model('user_collections', userCollections),
  User = {},
  UserCollection = {},
  FeaturedCollection = dbconfig.db.collection('featured_collections');

User.findByEmail = function(email, callback) {
  Users.findOne({ email: email }, callback);
};

UserCollection.createCollection = function (collectionDetails, callback) {
  collectionDetails._scmd = {
    // Last Modified Time
    lmt: new Date(),
    // Entitiy Creation Time
    ect: new Date()
  };
  var collectionItem = new UserCollections(collectionDetails);
  collectionItem.save(callback);
};

UserCollection.addToCollection = function (cid, meta_id, callback) {
  UserCollections.findOneAndUpdate(
    { cid: cid },
    { $addToSet: { meta_ids: meta_id } },
    {safe: true, upsert: true},
    function(err, model) {
      model._scmd.lmt = new Date();
      model.markModified('_scmd');
      model.save();
      return callback(err, model);
    }
  );
};

UserCollection.findByAuthor = function (author, callback) {
  UserCollections.find({author: author}, callback);
};

UserCollection.findById = function (id, callback) {
  UserCollections.find({_id: id}, callback);
};

UserCollection.deleteCollection = function (cid, callback) {
  UserCollections.findOne({cid: cid}, function (error, collection) {
    if (error !== null) {
      return callback(error);
    } else {
      collection.remove(callback);
    }
  });
};

FeaturedCollection.findBySlug = function(slug, callback){
  FeaturedCollection.findOne({slug:slug}, callback)
}

module.exports = {
  User: User,
  UserCollection: UserCollection,
  FeaturedCollection: FeaturedCollection
};
