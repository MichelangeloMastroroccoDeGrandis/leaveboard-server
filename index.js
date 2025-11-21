// Libraries
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import wfhRoutes from './routes/wfhRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';
import holidayRoutes from './routes/holidayRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

// 1. Loads environment variables from a .env file into process.env
dotenv.config();

// 2. Initialize express app (creates an instances of the express application)
const app = express();

// 3. Enable Cors
app.use(cors());

// 4. Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet());

// 5. Middleware to parse JSON requests bodies
// without this middleware, the server cannot read JSON data sent in requests
app.use(express.json());

connectDB();

// Ensure a superuser exists (promote or create) based on env configuration
const ensureSuperuser = async () => {
  try {
    const email = process.env.SUPERUSER_EMAIL;
    const password = process.env.SUPERUSER_PASSWORD;
    const name = process.env.SUPERUSER_NAME || 'Superuser';

    if (!email) {
      console.log('[seed] SUPERUSER_EMAIL not set, skipping superuser seeding');
      return;
    }

    let user = await User.findOne({ email });
    if (!user) {
      if (!password) {
        console.warn('[seed] SUPERUSER_PASSWORD not set, cannot create superuser');
        return;
      }
      const hashed = await bcrypt.hash(password, 10);
      user = await User.create({
        name,
        email,
        password: hashed,
        role: 'superuser',
        isActive: true,
      });
      console.log(`[seed] Superuser created for ${email}`);
      return;
    }

    if (user.role !== 'superuser') {
      user.role = 'superuser';
      await user.save();
      console.log(`[seed] User ${email} promoted to superuser`);
    } else {
      console.log(`[seed] Superuser already present for ${email}`);
    }
  } catch (err) {
    console.error('[seed] Error ensuring superuser:', err);
  }
};

ensureSuperuser();

app.get('/', (req, res) => {
  res.send('server is running');
});

// 6. Middleware to handle routes
app.use('/api/auth', authRoutes); // Handles authentication routes like login and registration
app.use('/api/dashboard', dashboardRoutes); // Handles dashboard routes 
app.use('/api/wfh', wfhRoutes); // Handles work from home requests and approvals
app.use('/api/admin', adminRoutes); // Handles admin routes like user management
app.use('/api/calendar', calendarRoutes); // Handles calendar-related routes
app.use('/api/holidays', holidayRoutes); // Handles public holiday management
app.use('/api/settings', settingsRoutes); // Handles configurable settings such as WFH rules

app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});



// Set the port from environment variable or default to 5000
const PORT = process.env.PORT || 5000;

// Start the server and listen on the specified port
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
