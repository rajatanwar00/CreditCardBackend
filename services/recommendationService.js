const { CreditCard } = require('../models');
const { Op } = require('sequelize');

async function generateRecommendations(preferences) {
  try {
    // Build query based on user preferences
    const whereClause = buildWhereClause(preferences);
    
    // Get all eligible cards
    const allCards = await CreditCard.findAll({
      where: whereClause,
      order: [['name', 'ASC']]
    });

    // Score and rank cards
    const scoredCards = scoreCards(allCards, preferences);
    
    // Return top 5 recommendations
    const topRecommendations = scoredCards
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(card => ({
        ...card.toJSON(),
        score: card.score,
        reasons: generateReasons(card, preferences),
        estimatedRewards: calculateEstimatedRewards(card, preferences)
      }));

    return {
      recommendations: topRecommendations,
      totalCards: allCards.length
    };

  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
}

function buildWhereClause(preferences) {
  const whereClause = {};

  // Filter by minimum income
  if (preferences.monthlyIncome) {
    whereClause.minIncome = {
      [Op.lte]: preferences.monthlyIncome
    };
  }

  // Filter by maximum annual fee
  if (preferences.maxAnnualFee) {
    whereClause.annualFee = {
      [Op.lte]: preferences.maxAnnualFee
    };
  }

  // Filter by credit score
  if (preferences.creditScore && preferences.creditScore !== 'unknown') {
    const creditScoreRanges = {
      'excellent': { [Op.gte]: 750 },
      'good': { [Op.between]: [700, 749] },
      'fair': { [Op.between]: [650, 699] },
      'poor': { [Op.lt]: 650 }
    };
    
    if (creditScoreRanges[preferences.creditScore]) {
      whereClause.creditScore = creditScoreRanges[preferences.creditScore];
    }
  }

  return whereClause;
}

function scoreCards(cards, preferences) {
  return cards.map(card => {
    let score = 0;

    // Base score
    score += 50;

    // Reward type preference
    if (preferences.preferredBenefits && preferences.preferredBenefits.length > 0) {
      const cardRewardType = card.rewardType;
      if (preferences.preferredBenefits.includes(cardRewardType)) {
        score += 20;
      }
      
      // Check perks for preferred benefits
      const perks = card.perks.toLowerCase();
      preferences.preferredBenefits.forEach(benefit => {
        if (perks.includes(benefit.replace('_', ' '))) {
          score += 10;
        }
      });
    }

    // Category preference based on spending habits
    if (preferences.spendingHabits) {
      const spending = preferences.spendingHabits;
      const totalSpending = Object.values(spending).reduce((sum, val) => sum + (val || 0), 0);
      
      if (totalSpending > 0) {
        // Travel category
        if (spending.travel && spending.travel > 5000 && card.category === 'travel') {
          score += 15;
        }
        
        // Fuel category
        if (spending.fuel && spending.fuel > 3000 && card.category === 'fuel') {
          score += 15;
        }
        
        // Dining category
        if (spending.dining && spending.dining > 2000 && card.category === 'dining') {
          score += 15;
        }
        
        // Shopping category
        if (spending.groceries && spending.groceries > 3000 && card.category === 'shopping') {
          score += 15;
        }
      }
    }

    // Fee preference (lower fees get higher scores)
    if (preferences.maxAnnualFee) {
      const feeRatio = card.annualFee / preferences.maxAnnualFee;
      if (feeRatio <= 0.5) {
        score += 10;
      } else if (feeRatio <= 0.8) {
        score += 5;
      }
    }

    // Income compatibility
    if (preferences.monthlyIncome && card.minIncome) {
      const incomeRatio = preferences.monthlyIncome / card.minIncome;
      if (incomeRatio >= 2) {
        score += 10;
      } else if (incomeRatio >= 1.5) {
        score += 5;
      }
    }

    // Credit score compatibility
    if (preferences.creditScore && preferences.creditScore !== 'unknown') {
      const scoreRanges = {
        'excellent': [750, 900],
        'good': [700, 749],
        'fair': [650, 699],
        'poor': [300, 649]
      };
      
      const userScoreRange = scoreRanges[preferences.creditScore];
      if (userScoreRange && card.creditScore >= userScoreRange[0] && card.creditScore <= userScoreRange[1]) {
        score += 10;
      }
    }

    card.score = score;
    return card;
  });
}

function generateReasons(card, preferences) {
  const reasons = [];

  // Reward type reason
  if (preferences.preferredBenefits && preferences.preferredBenefits.includes(card.rewardType)) {
    reasons.push(`Matches your preferred ${card.rewardType} rewards`);
  }

  // Category reason
  if (preferences.spendingHabits) {
    const spending = preferences.spendingHabits;
    if (spending.travel && spending.travel > 5000 && card.category === 'travel') {
      reasons.push(`Great for your travel spending (₹${spending.travel}/month)`);
    }
    if (spending.fuel && spending.fuel > 3000 && card.category === 'fuel') {
      reasons.push(`Excellent fuel rewards for your spending (₹${spending.fuel}/month)`);
    }
    if (spending.dining && spending.dining > 2000 && card.category === 'dining') {
      reasons.push(`Perfect for dining rewards (₹${spending.dining}/month)`);
    }
  }

  // Fee reason
  if (preferences.maxAnnualFee && card.annualFee <= preferences.maxAnnualFee * 0.8) {
    reasons.push(`Low annual fee (₹${card.annualFee}) within your budget`);
  }

  // Income reason
  if (preferences.monthlyIncome && card.minIncome && preferences.monthlyIncome >= card.minIncome * 1.5) {
    reasons.push(`Income requirement well within your range`);
  }

  return reasons;
}

function calculateEstimatedRewards(card, preferences) {
  if (!preferences.spendingHabits) {
    return "Unable to calculate without spending data";
  }

  const spending = preferences.spendingHabits;
  const totalSpending = Object.values(spending).reduce((sum, val) => sum + (val || 0), 0);
  
  if (totalSpending === 0) {
    return "No spending data available";
  }

  // Simple reward calculation (this can be made more sophisticated)
  let rewardRate = 0;
  
  // Extract reward rate from card data
  const rateMatch = card.rewardRate.match(/(\d+(?:\.\d+)?)/);
  if (rateMatch) {
    rewardRate = parseFloat(rateMatch[1]) / 100; // Convert percentage to decimal
  }

  const annualSpending = totalSpending * 12;
  const estimatedRewards = annualSpending * rewardRate;

  return {
    annualSpending: `₹${annualSpending.toLocaleString()}`,
    rewardRate: card.rewardRate,
    estimatedRewards: `₹${Math.round(estimatedRewards).toLocaleString()}`,
    netBenefit: `₹${Math.round(estimatedRewards - card.annualFee).toLocaleString()}`
  };
}

module.exports = {
  generateRecommendations
}; 