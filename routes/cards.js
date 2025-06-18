const express = require('express');
const router = express.Router();
const { CreditCard } = require('../models');

// Get all credit cards
router.get('/', async (req, res) => {
  try {
    const cards = await CreditCard.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      cards
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get card by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const card = await CreditCard.findByPk(id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({
      success: true,
      card
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// Get cards by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const cards = await CreditCard.findAll({
      where: { category },
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      cards
    });
  } catch (error) {
    console.error('Error fetching cards by category:', error);
    res.status(500).json({ error: 'Failed to fetch cards by category' });
  }
});

// Search cards
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    const cards = await CreditCard.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { name: { [require('sequelize').Op.like]: `%${query}%` } },
          { issuer: { [require('sequelize').Op.like]: `%${query}%` } },
          { rewardType: { [require('sequelize').Op.like]: `%${query}%` } }
        ]
      },
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      cards
    });
  } catch (error) {
    console.error('Error searching cards:', error);
    res.status(500).json({ error: 'Failed to search cards' });
  }
});

module.exports = router; 