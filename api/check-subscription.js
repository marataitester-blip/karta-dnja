export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId не указан' });
  }

  // Здесь должна быть проверка в базе данных
  // Пока возвращаем заглушку

  return res.status(200).json({
    hasActiveSubscription: false,
    expiryDate: null,
    freeTriesLeft: 5
  });
}