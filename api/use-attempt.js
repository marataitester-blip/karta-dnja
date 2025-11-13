const { recordAttempt } = require('./database');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Get userId from query or body
    const userId = req.method === 'POST' ? req.body?.userId : req.query.userId;

    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }

    // Record the attempt
    await recordAttempt(userId);

    res.status(200).json({ 
      success: true,
      message: 'Attempt recorded successfully'
    });
  } catch (error) {
    console.error('Error recording attempt:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to record attempt' 
    });
  }
};
