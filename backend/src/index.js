require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const panelsRouter = require('./routes/panels');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/panels', panelsRouter);
app.use('/api/analytics', analyticsRouter);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
