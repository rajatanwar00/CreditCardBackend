const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CreditCard = sequelize.define('CreditCard', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  issuer: {
    type: DataTypes.STRING,
    allowNull: false
  },
  joiningFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  annualFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  rewardType: {
    type: DataTypes.ENUM('cashback', 'points', 'miles', 'rewards'),
    allowNull: false
  },
  rewardRate: {
    type: DataTypes.STRING,
    allowNull: false
  },
  eligibilityCriteria: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  perks: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  affiliateLink: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  minIncome: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  creditScore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  category: {
    type: DataTypes.ENUM('travel', 'shopping', 'fuel', 'dining', 'general'),
    allowNull: false,
    defaultValue: 'general'
  }
}, {
  tableName: 'credit_cards',
  timestamps: true
});

module.exports = CreditCard; 