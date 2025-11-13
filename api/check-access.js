// api/check-access.js
const db = require('./database');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'GET' || req.method === 'POST') {
    try {
      const userId = req.query.userId || req.body?.userId;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      // Check user access
      const accessInfo = await db.checkUserAccess(userId);
      
      return res.status(200).json({
        hasAccess: accessInfo.hasAccess,
        isPaid: accessInfo.isPaid,
        attemptsLeft: accessInfo.attemptsLeft,
        message: accessInfo.hasAccess 
          ? (accessInfo.isPaid ? 'У вас безлимитный доступ' : `Осталось ${accessInfo.attemptsLeft} попыток`)
          : 'Бесплатные попытки закончились'
      });
    } catch (error) {
      console.error('Check access error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
