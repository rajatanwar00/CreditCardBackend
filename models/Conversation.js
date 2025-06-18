const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  response: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  step: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  messageType: {
    type: DataTypes.ENUM('user', 'agent'),
    allowNull: false,
    defaultValue: 'user'
  }
}, {
  tableName: 'conversations',
  timestamps: true
});

module.exports = Conversation; 