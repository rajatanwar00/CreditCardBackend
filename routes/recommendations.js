const express = require('express');
const router = express.Router();
const { UserPreference, CreditCard } = require('../models');
const { generateRecommendations } = require('../services/recommendationService');

// Get recommendations for a session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get user preferences
    const preferences = await UserPreference.findOne({
      where: { sessionId }
    });

    if (!preferences) {
      return res.status(404).json({ error: 'User preferences not found' });
    }

    // Generate recommendations
    const recommendations = await generateRecommendations(preferences);

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Compare specific cards
router.post('/compare', async (req, res) => {
  try {
    const { cardIds } = req.body;
    
    if (!cardIds || !Array.isArray(cardIds) || cardIds.length < 2) {
      return res.status(400).json({ error: 'At least 2 card IDs are required for comparison' });
    }

    const cards = await CreditCard.findAll({
      where: { id: cardIds },
      order: [['name', 'ASC']]
    });

    if (cards.length !== cardIds.length) {
      return res.status(404).json({ error: 'Some cards not found' });
    }

    res.json({
      success: true,
      comparison: cards
    });
  } catch (error) {
    console.error('Error comparing cards:', error);
    res.status(500).json({ error: 'Failed to compare cards' });
  }
});

// Get personalized recommendations based on preferences
router.post('/personalized', async (req, res) => {
  try {
    const {
      monthlyIncome,
      spendingHabits,
      preferredBenefits,
      creditScore,
      maxAnnualFee
    } = req.body;

    // Create temporary preferences object
    const preferences = {
      monthlyIncome,
      spendingHabits,
      preferredBenefits,
      creditScore,
      maxAnnualFee
    };

    // Generate recommendations
    const recommendations = await generateRecommendations(preferences);

    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    console.error('Error generating personalized recommendations:', error);
    res.status(500).json({ error: 'Failed to generate personalized recommendations' });
  }
});

module.exports = router; 