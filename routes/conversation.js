const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { UserSession, Conversation, UserPreference } = require('../models');
const { handleConversation, getConversationHistory, cleanupSession } = require('../services/conversationService');

const INITIAL_GREETING = "Hello! I'm your AI credit card advisor. To help you find the perfect credit card, I'll need to understand your financial profile. Let's start with the basics - what's your monthly income?";

// Start a new conversation session
router.post('/start', async (req, res) => {
  try {
    const sessionId = uuidv4();
    
    const session = await UserSession.create({
      sessionId,
      status: 'active',
      currentStep: 0
    });

    // Use static greeting instead of calling OpenAI
    await Conversation.create({
      sessionId,
      message: '',
      response: INITIAL_GREETING,
      step: 0,
      messageType: 'agent'
    });

    res.json({
      success: true,
      sessionId,
      message: INITIAL_GREETING
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Continue conversation
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }

    // Get current session
    const session = await UserSession.findOne({ where: { sessionId } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Store user message in our database
    await Conversation.create({
      sessionId,
      message,
      response: '',
      step: session.currentStep,
      messageType: 'user'
    });

    try {
      // Process message with OpenAI Assistant
      const response = await handleConversation(sessionId, message);

      // Store agent response
      await Conversation.create({
        sessionId,
        message: '',
        response,
        step: session.currentStep,
        messageType: 'agent'
      });

      // Update session step
      await session.update({ currentStep: session.currentStep + 1 });

      res.json({
        success: true,
        response,
        currentStep: session.currentStep + 1
      });
    } catch (error) {
      // Check if it's a rate limit error
      if (error.message && error.message.includes('rate_limit_exceeded')) {
        return res.status(429).json({
          error: 'Service is currently busy. Please try again in a few moments.',
          retryAfter: 60 // Suggest retry after 1 minute
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message
    });
  }
});

// Get conversation history from OpenAI Assistant
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Get conversation history from OpenAI Assistant
    const openaiHistory = await getConversationHistory(sessionId);
    
    // Also get from our database as backup
    const dbConversations = await Conversation.findAll({
      where: { sessionId },
      order: [['createdAt', 'ASC']]
    });

    res.json({
      success: true,
      openaiHistory,
      dbConversations
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

// End conversation session
router.post('/end/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Update session status
    const session = await UserSession.findOne({ where: { sessionId } });
    if (session) {
      await session.update({ status: 'completed' });
    }

    // Clean up OpenAI thread
    await cleanupSession(sessionId);

    res.json({
      success: true,
      message: 'Conversation ended successfully'
    });
  } catch (error) {
    console.error('Error ending conversation:', error);
    res.status(500).json({ error: 'Failed to end conversation' });
  }
});

module.exports = router; 