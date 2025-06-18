const sequelize = require('../config/database');
const CreditCard = require('./CreditCard');
const UserSession = require('./UserSession');
const Conversation = require('./Conversation');
const UserPreference = require('./UserPreference');

// Define associations
UserSession.hasMany(Conversation, { 
  foreignKey: 'sessionId',
  sourceKey: 'sessionId'
});
Conversation.belongsTo(UserSession, { 
  foreignKey: 'sessionId',
  targetKey: 'sessionId'
});

UserSession.hasOne(UserPreference, { 
  foreignKey: 'sessionId',
  sourceKey: 'sessionId'
});
UserPreference.belongsTo(UserSession, { 
  foreignKey: 'sessionId',
  targetKey: 'sessionId'
});

module.exports = {
  sequelize,
  CreditCard,
  UserSession,
  Conversation,
  UserPreference
}; 