const OpenAI = require('openai');
const { UserPreference, CreditCard } = require('../models');
const { generateRecommendations } = require('./recommendationService');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Store active assistants and threads
const activeAssistants = new Map();
const activeThreads = new Map();
let globalAssistant = null; // Store single assistant instance

// Create the credit card advisor assistant
async function createAssistant() {
  try {
    console.log('Creating new assistant...');
    
    // If we already have a global assistant, return it
    if (globalAssistant) {
      console.log('Reusing existing assistant:', globalAssistant.id);
      return globalAssistant;
    }

    const assistant = await openai.beta.assistants.create({
      name: "Credit Card Advisor",
      instructions: `You are an expert credit card advisor helping users find the perfect credit card based on their needs and preferences.

Your role is to:
1. Have a natural, conversational dialogue with users
2. Collect information about their financial profile and preferences
3. Ask relevant follow-up questions based on their responses
4. Provide intelligent explanations and clarifications
5. Use the available tools to get recommendations when you have enough information

Information you need to collect:
- Monthly/annual income
- Spending habits (fuel, travel, groceries, dining, shopping, etc.)
- Preferred benefits (cashback, travel points, lounge access, shopping rewards, fuel rewards)
- Existing credit cards (if any)
- Approximate credit score (excellent: 750+, good: 700-749, fair: 650-699, poor: below 650, or unknown)
- Maximum annual fee they're comfortable with
- Any specific preferences or requirements

Guidelines:
- Be friendly, professional, and helpful
- Ask one question at a time and wait for the user's response
- If the user provides incomplete information, ask for clarification
- If they mention specific spending categories, ask for amounts
- If they're unsure about credit score, explain the ranges and ask them to estimate
- Once you have sufficient information, use the get_recommendations tool
- Explain why you're recommending specific cards
- Provide estimated rewards based on their spending patterns

Start by introducing yourself and asking about their monthly income.`,
      model: "gpt-3.5-turbo",
      tools: [
        {
          type: "function",
          function: {
            name: "get_recommendations",
            description: "Get personalized credit card recommendations based on user preferences",
            parameters: {
              type: "object",
              properties: {
                monthlyIncome: {
                  type: "integer",
                  description: "User's monthly income in rupees"
                },
                spendingHabits: {
                  type: "object",
                  properties: {
                    fuel: { type: "integer", description: "Monthly fuel spending" },
                    travel: { type: "integer", description: "Monthly travel spending" },
                    groceries: { type: "integer", description: "Monthly grocery spending" },
                    dining: { type: "integer", description: "Monthly dining spending" },
                    shopping: { type: "integer", description: "Monthly shopping spending" }
                  }
                },
                preferredBenefits: {
                  type: "array",
                  items: { type: "string" },
                  description: "Preferred benefits like cashback, travel_points, lounge_access, shopping_rewards, fuel_rewards"
                },
                existingCards: {
                  type: "string",
                  description: "Existing credit cards or 'none'"
                },
                creditScore: {
                  type: "string",
                  enum: ["excellent", "good", "fair", "poor", "unknown"],
                  description: "User's credit score range"
                },
                maxAnnualFee: {
                  type: "integer",
                  description: "Maximum annual fee willing to pay"
                }
              },
              required: ["monthlyIncome"]
            }
          }
        }
      ]
    });

    console.log('Assistant created with ID:', assistant.id);
    globalAssistant = assistant; // Store the assistant globally
    return assistant;
  } catch (error) {
    console.error('Error creating assistant:', error);
    throw error;
  }
}

// Initialize assistant for a session
async function initializeSession(sessionId) {
  try {
    // Always use the global assistant
    const assistant = await createAssistant();

    // Create thread for this session
    console.log('Creating new thread for session:', sessionId);
    const thread = await openai.beta.threads.create();
    console.log('Thread created with ID:', thread.id);
    activeThreads.set(sessionId, thread);

    return { assistant, thread };
  } catch (error) {
    console.error('Error initializing session:', error);
    throw error;
  }
}

// Handle conversation with OpenAI Assistant
async function handleConversation(sessionId, userMessage) {
  try {
    // Get or create assistant and thread
    let assistant, thread;
    if (activeThreads.has(sessionId)) {
      thread = activeThreads.get(sessionId);
      assistant = globalAssistant;
      console.log('Using existing thread:', thread.id, 'and assistant:', assistant.id);
    } else {
      const session = await initializeSession(sessionId);
      assistant = session.assistant;
      thread = session.thread;
    }

    // Add user message to thread
    console.log('Adding user message to thread:', userMessage);
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage
    });

    // Run the assistant
    console.log('Starting assistant run...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });
    console.log('Run created with ID:', run.id);

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log('Initial run status:', runStatus.status);
    
    while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('Updated run status:', runStatus.status);
    }

    // Check for run failure
    if (runStatus.status === 'failed') {
      console.error('Run failed:', runStatus.last_error);
      // Get the run steps to see what went wrong
      const runSteps = await openai.beta.threads.runs.steps.list(thread.id, run.id);
      console.error('Run steps:', JSON.stringify(runSteps, null, 2));
      throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    // Handle function calls if needed
    if (runStatus.status === 'requires_action') {
      console.log('Run requires action, processing tool calls...');
      const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        console.log('Processing tool call:', functionName, functionArgs);

        let result;
        if (functionName === 'get_recommendations') {
          result = await generateRecommendations(functionArgs);
        }

        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify(result)
        });
      }

      // Submit tool outputs
      console.log('Submitting tool outputs...');
      await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
        tool_outputs: toolOutputs
      });

      // Wait for the run to complete after tool calls
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log('Run status after tool calls:', runStatus.status);
      
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        console.log('Updated run status after tool calls:', runStatus.status);
      }

      // Check for run failure after tool calls
      if (runStatus.status === 'failed') {
        console.error('Run failed after tool calls:', runStatus.last_error);
        throw new Error(`Assistant run failed after tool calls: ${runStatus.last_error?.message || 'Unknown error'}`);
      }
    }

    // Get the assistant's response
    console.log('Getting messages from thread...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    console.log('Thread messages:', JSON.stringify(messages.data, null, 2));

    // Find the most recent assistant message
    const assistantMessage = messages.data.find(
      msg => msg.role === 'assistant' && msg.content && msg.content[0]?.text?.value
    );

    if (assistantMessage) {
      console.log('Found assistant message:', assistantMessage.content[0].text.value);
      return assistantMessage.content[0].text.value;
    } else {
      console.log('No assistant message found in thread');
      return "I'm sorry, I couldn't generate a response. Please try again.";
    }

  } catch (error) {
    console.error('Error in conversation service:', error);
    return `I'm sorry, I encountered an error: ${error.message}. Please try again or restart the conversation.`;
  }
}

// Save user preferences to database
async function saveUserPreferences(preferences) {
  try {
    const { sessionId, ...userPrefs } = preferences;
    
    // Get or create user preferences
    let userPreference = await UserPreference.findOne({ where: { sessionId } });
    if (!userPreference) {
      userPreference = await UserPreference.create({ sessionId });
    }

    // Update preferences
    await userPreference.update(userPrefs);

    return { success: true, message: "Preferences saved successfully" };
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return { success: false, error: "Failed to save preferences" };
  }
}

// Get conversation history
async function getConversationHistory(sessionId) {
  try {
    if (!activeThreads.has(sessionId)) {
      return [];
    }

    const thread = activeThreads.get(sessionId);
    const messages = await openai.beta.threads.messages.list(thread.id);
    
    return messages.data.map(msg => ({
      role: msg.role,
      content: msg.content[0].text.value,
      createdAt: msg.created_at
    }));
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return [];
  }
}

// Clean up session
async function cleanupSession(sessionId) {
  try {
    if (activeThreads.has(sessionId)) {
      const thread = activeThreads.get(sessionId);
      await openai.beta.threads.del(thread.id);
      activeThreads.delete(sessionId);
    }
  } catch (error) {
    console.error('Error cleaning up session:', error);
  }
}

module.exports = {
  handleConversation,
  getConversationHistory,
  cleanupSession
}; 