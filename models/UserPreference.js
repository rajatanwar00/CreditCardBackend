const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserPreference = sequelize.define('UserPreference', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  monthlyIncome: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  spendingHabits: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Stores spending categories like fuel, travel, groceries, dining'
  },
  preferredBenefits: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Stores preferred benefits like cashback, travel points, lounge access'
  },
  existingCards: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  creditScore: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor', 'unknown'),
    allowNull: true,
    defaultValue: 'unknown'
  },
  preferredCardType: {
    type: DataTypes.ENUM('travel', 'shopping', 'fuel', 'dining', 'general'),
    allowNull: true
  },
  maxAnnualFee: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'user_preferences',
  timestamps: true
});

module.exports = UserPreference; 