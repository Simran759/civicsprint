const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const issueRoutes = require('./routes/issueRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// 1. Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allows frontend to read static upload files
  })
);

// 2. CORS configuration
app.use(
  cors({
    origin: true, // Dynamically allow any origin (perfect for Vercel/Render deployments)
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

// 3. Request Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// 4. Rate Limiting for security
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use('/api', limiter);

// 5. Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 6. Serve static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 7. Core Route Bindings
const { extractUser } = require('./middleware/authMiddleware');
app.use(extractUser);

app.use('/api/issues', issueRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Test endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// 8. Serve Frontend in Production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  
  app.get('*', (req, res) => {
    // Exclude /api routes from being caught by this
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, error: 'API resource not found' });
    }
    res.sendFile(path.join(__dirname, '../../frontend/dist', 'index.html'));
  });
} else {
  // 404 Route handler for API in development
  app.use((req, res, next) => {
    res.status(404).json({ success: false, error: 'API resource not found' });
  });
}

// 9. Global Error Handling Middleware
app.use(errorHandler);

module.exports = app;
