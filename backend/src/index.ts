import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initFirebase } from './services/firebase';
import routes from './routes';
import { handleStripeWebhook } from './routes/stripeWebhook';

const app = express();
const PORT = process.env.PORT || 8080;

// Initialize Firebase
initFirebase();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

// Stripe webhook needs the raw request body for signature verification,
// so it must be registered before the global JSON body parser.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/api', routes);

app.listen(PORT, () => {
  console.log(`Tryda API running on port ${PORT}`);
});

export default app;
