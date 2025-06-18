const { sequelize } = require('./models');
const { seedCreditCards } = require('./seeders/creditCards');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Sync database (create tables)
    await sequelize.sync({ force: true });
    console.log('Database tables created successfully.');
    
    // Seed credit cards
    await seedCreditCards();
    console.log('Credit cards seeded successfully.');
    
    console.log('Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase }; 