const path = require('path');
// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const app = require('./src/app');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicmind';

// Disable query strict mode warnings in mongoose
mongoose.set('strictQuery', false);

// Establish database connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB database.');

    // Start listening on network port
    const server = app.listen(PORT, () => {
      console.log(`CivicMind AI backend server listening on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });

    // Graceful Shutdown logic
    const gracefulShutdown = () => {
      console.log('Shutting down gracefully...');
      server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false).then(() => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  })
  .catch((err) => {
    console.error('Database connection failed. Exiting process...', err.message);
    process.exit(1);
  });
