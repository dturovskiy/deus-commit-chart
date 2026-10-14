'use strict';

// Vercel-style Node.js function, dormant until a dedicated hosting deployment.
// No existing Actions workflow or release entry point imports this module.
const { createLiveChartHandler } = require('../live-chart/handler');

module.exports = createLiveChartHandler();
