const mongoose = require('mongoose');

const scraperLogSchema = new mongoose.Schema({
  ranAt: { type: Date, default: Date.now },
  totalAdded: { type: Number, default: 0 },
  totalSkipped: { type: Number, default: 0 },
  details: { type: mongoose.Schema.Types.Mixed },
});

module.exports = mongoose.model('ScraperLog', scraperLogSchema);
