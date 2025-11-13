export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'BOT_TOKEN не настроен в Vercel' });
  }

  const { userId, duration } = req.body;

  if (!userId || !duration) {
    return res.status(400).json({ error: 'Не указаны userId или duration' });
  }

  const priceMap = {
    24: { stars: 10, label: '24 часа' },
    72: { stars: 25, label: '3 дня' },
    168: { stars: 50, label: '7 дней' }
  };

  const priceInfo = priceMap[duration];

  if (!priceInfo) {
    return res.status(400).json({ error: 'Неверная длительность' });
  }

  const invoiceData = {
    title: `Карта дня - ${priceInfo.label}`,
    description: `Безлимитный доступ к картам таро на ${priceInfo.label}`,
    payload: JSON.stringify({ 
      userId, 
      duration,
      timestamp: Date.now()
    }),
    currency: 'XTR',
    prices: [{ label: 'Подписка', amount: priceInfo.stars }]
  };

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      }
    );

    const data = await response.json();

    if (data.ok) {
      return res.status(200).json({ 
        success: true,
        invoiceUrl: data.result 
      });
    } else {
      return res.status(400).json({ 
        error: data.description || 'Ошибка создания счета' 
      });
    }
  } catch (error) {
    console.error('Ошибка API:', error);
    return res.status(500).json({ 
      error: 'Ошибка сервера',
      details: error.message 
    });
  }
}