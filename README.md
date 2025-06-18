# Credit Card Advisor Backend

A Node.js backend API for an AI-powered credit card recommendation system using OpenAI Assistants API.

## Features

- **OpenAI Assistants API Integration**: Intelligent, dynamic conversation flow
- **MySQL Database**: Stores credit cards, user sessions, and preferences
- **Sequelize ORM**: Database management and relationships
- **RESTful API**: Clean endpoints for conversation and recommendations
- **Session Management**: Track user conversations and preferences

## Prerequisites

- Node.js (v14 or higher)
- MySQL database
- OpenAI API key

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   - Copy `env.example` to `.env`
   - Fill in your database and OpenAI credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=credit_card_advisor
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   OPENAI_API_KEY=your_openai_api_key
   PORT=5000
   ```

3. **Database Setup**:
   - Create a MySQL database named `credit_card_advisor`
   - Run the seeder to populate with credit card data:
   ```bash
   npm run seed
   ```

4. **Start the server**:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Conversation Management

#### Start Conversation
```http
POST /api/conversation/start
```
**Response**:
```json
{
  "success": true,
  "sessionId": "uuid-string",
  "message": "Hello! I'm your personal credit card advisor..."
}
```

#### Send Message
```http
POST /api/conversation/message
Content-Type: application/json

{
  "sessionId": "uuid-string",
  "message": "My monthly income is 50000 rupees"
}
```
**Response**:
```json
{
  "success": true,
  "response": "Great! Now let me ask about your spending habits...",
  "currentStep": 1
}
```

#### Get Conversation History
```http
GET /api/conversation/history/:sessionId
```

#### End Conversation
```http
POST /api/conversation/end/:sessionId
```

### Credit Cards

#### Get All Cards
```http
GET /api/cards
```

#### Get Card by ID
```http
GET /api/cards/:id
```

#### Get Cards by Category
```http
GET /api/cards/category/:category
```

#### Search Cards
```http
GET /api/cards/search/:query
```

### Recommendations

#### Get Recommendations for Session
```http
GET /api/recommendations/:sessionId
```

#### Compare Cards
```http
POST /api/recommendations/compare
Content-Type: application/json

{
  "cardIds": [1, 2, 3]
}
```

#### Get Personalized Recommendations
```http
POST /api/recommendations/personalized
Content-Type: application/json

{
  "monthlyIncome": 50000,
  "spendingHabits": {
    "fuel": 3000,
    "travel": 8000,
    "groceries": 5000,
    "dining": 2000
  },
  "preferredBenefits": ["cashback", "lounge_access"],
  "creditScore": "good",
  "maxAnnualFee": 3000
}
```

## Database Schema

### CreditCard
- Stores credit card information (name, issuer, fees, rewards, etc.)
- 21 Indian credit cards pre-populated

### UserSession
- Tracks conversation sessions
- Manages session state and progress

### UserPreference
- Stores user preferences collected during conversation
- JSON fields for flexible data storage

### Conversation
- Stores conversation history
- Backup for OpenAI thread data

## OpenAI Integration

The system uses OpenAI Assistants API for:
- **Dynamic Conversation Flow**: Natural, context-aware dialogue
- **Intelligent Questioning**: Follow-up questions based on user responses
- **Function Calling**: Database queries and recommendation generation
- **Context Management**: Maintains conversation context across messages

### Assistant Tools
1. **get_recommendations**: Generates personalized card recommendations
2. **save_user_preferences**: Stores user preferences to database

## Development

### Project Structure
```
backend/
├── config/
│   └── database.js          # Database configuration
├── models/
│   ├── index.js            # Model associations
│   ├── CreditCard.js       # Credit card model
│   ├── UserSession.js      # Session model
│   ├── Conversation.js     # Conversation model
│   └── UserPreference.js   # User preferences model
├── routes/
│   ├── conversation.js     # Conversation endpoints
│   ├── cards.js           # Credit card endpoints
│   └── recommendations.js # Recommendation endpoints
├── services/
│   ├── conversationService.js    # OpenAI integration
│   └── recommendationService.js  # Recommendation logic
├── seeders/
│   └── creditCards.js      # Credit card data
├── server.js               # Main server file
├── seedDatabase.js         # Database seeder
└── package.json
```

### Environment Variables
- `DB_HOST`: MySQL host
- `DB_PORT`: MySQL port
- `DB_NAME`: Database name
- `DB_USER`: MySQL username
- `DB_PASSWORD`: MySQL password
- `OPENAI_API_KEY`: OpenAI API key
- `PORT`: Server port (default: 5000)

## Testing

Test the API endpoints using tools like Postman or curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Start conversation
curl -X POST http://localhost:5000/api/conversation/start

# Send message
curl -X POST http://localhost:5000/api/conversation/message \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"your-session-id","message":"My income is 50000"}'
```

## License

ISC 