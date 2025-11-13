// api/webhook.js
const TelegramBot = require('node-telegram-bot-api');
const db = require('./database');

const token = process.env.TELEGRAM_BOT_TOKEN;
const webAppUrl = process.env.WEB_APP_URL || 'https://karta-dnja.vercel.app';

const bot = new TelegramBot(token);

const PRICES = {
  daily_access: 10,
  donation_small: 50,
  donation_medium: 100,
  donation_large: 500
};

async function handleStart(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  const accessInfo = await db.checkUserAccess(userId);
  
  let statusText = '';
  if (accessInfo.hasAccess && accessInfo.isPaid) {
    statusText = '\n✅ У вас активен безлимитный доступ';
  } else if (accessInfo.hasAccess) {
    statusText = `\n🎁 Бесплатных попыток: ${accessInfo.attemptsLeft}`;
  } else {
    statusText = '\n⚠️ Бесплатные попытки закончились';
  }
  
  const keyboard = {
    inline_keyboard: [
      [{ text: '🔮 Открыть карты Таро', web_app: { url: webAppUrl } }],
      [{ text: '⭐ Купить доступ на сутки (10 Stars)', callback_data: 'buy_access' }],
      [{ text: '💝 Поддержать проект', callback_data: 'donate' }],
      [{ text: '❓ Помощь', callback_data: 'help' }]
    ]
  };
  
  await bot.sendMessage(chatId, 
    '🔮 *Добро пожаловать в Оракул Пути Героя!*\n\n' +
    '✨ Получите совет от карт Таро на сегодня\n' +
    statusText + '\n\n' +
    '📋 *Как это работает:*\n' +
    '• 5 бесплатных раскладов в сутки\n' +
    '• После — безлимит за 10 ⭐ на 24 часа\n' +
    '• Отсчет начинается с первой попытки',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  
  await bot.answerCallbackQuery(query.id);
  
  if (data === 'buy_access') {
    await sendAccessInvoice(chatId, userId);
  } else if (data === 'donate') {
    await showDonationOptions(chatId);
  } else if (data.startsWith('donate_')) {
    const amount = data.split('_')[1];
    await sendDonationInvoice(chatId, amount);
  } else if (data === 'help') {
    await showHelp(chatId);
  } else if (data === 'back_to_menu') {
    await handleStart({ chat: { id: chatId }, from: { id: userId } });
  }
}

async function sendAccessInvoice(chatId, userId) {
  const accessInfo = await db.checkUserAccess(userId);
  
  if (accessInfo.hasAccess && accessInfo.isPaid) {
    await bot.sendMessage(chatId, 
      '✅ У вас уже есть активный безлимитный доступ!\n\nОткройте приложение и наслаждайтесь раскладами.',
      { reply_markup: { inline_keyboard: [[{ text: '🔮 Открыть карты', web_app: { url: webAppUrl } }]] }}
    );
    return;
  }
  
  await bot.sendInvoice(
    chatId,
    '⭐ Безлимитный доступ на сутки',
    'Получите неограниченное количество раскладов на 24 часа',
    'daily_access',
    '',
    'XTR',
    [{ label: 'Доступ на сутки', amount: PRICES.daily_access }],
    {
      photo_url: 'https://cdn.jsdelivr.net/gh/marataitester-blip/tarot/card_back.jpg',
      photo_width: 400,
      photo_height: 600
    }
  );
}

async function showDonationOptions(chatId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: '☕ Кофе автору (50 ⭐)', callback_data: 'donate_small' }],
      [{ text: '🍕 Пицца (100 ⭐)', callback_data: 'donate_medium' }],
      [{ text: '🎁 Щедрый донат (500 ⭐)', callback_data: 'donate_large' }],
      [{ text: '« Назад', callback_data: 'back_to_menu' }]
    ]
  };
  
  await bot.sendMessage(chatId,
    '💝 *Поддержите развитие проекта!*\n\nВаши донаты помогают улучшать приложение и добавлять новые функции.\n\nВыберите удобную для вас сумму:',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
}

async function sendDonationInvoice(chatId, type) {
  const donations = {
    small: { title: '☕ Кофе автору', description: 'Спасибо за поддержку!', amount: PRICES.donation_small },
    medium: { title: '🍕 Пицца', description: 'Большое спасибо!', amount: PRICES.donation_medium },
    large: { title: '🎁 Щедрый донат', description: 'Огромное спасибо!', amount: PRICES.donation_large }
  };
  
  const donation = donations[type];
  if (!donation) return;
  
  await bot.sendInvoice(
    chatId, donation.title, donation.description, `donation_${type}`, '', 'XTR',
    [{ label: donation.title, amount: donation.amount }],
    { photo_url: 'https://cdn.jsdelivr.net/gh/marataitester-blip/tarot/hero.jpg', photo_width: 400, photo_height: 600 }
  );
}

async function showHelp(chatId) {
  await bot.sendMessage(chatId,
    '❓ *Помощь*\n\n' +
    '🔮 *Как пользоваться:*\n1. Нажмите "Открыть карты Таро"\n2. Вытяните карту дня\n3. Получите толкование\n\n' +
    '⭐ *Система попыток:*\n• Каждый день — 5 бесплатных раскладов\n• Отсчет начинается с первой попытки\n• После 5 попыток — безлимит за 10 Stars\n• Через 24 часа счетчик обнуляется\n\n' +
    '💝 *Поддержка:*\nВы можете поддержать проект добровольным донатом\n\n📧 Напишите /start для возврата в главное меню',
    { parse_mode: 'Markdown', reply_markup: { inline_keyboard: [[{ text: '« Назад в меню', callback_data: 'back_to_menu' }]] }}
  );
}

async function handlePreCheckout(query) {
  await bot.answerPreCheckoutQuery(query.id, true);
}

async function handleSuccessfulPayment(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const payment = msg.successful_payment;
  
  const chargeId = payment.telegram_payment_charge_id;
  const payload = payment.invoice_payload;
  
  await db.savePayment(userId, chargeId, { payload, amount: payment.total_amount, userId, chatId });
  
  if (payload === 'daily_access') {
    await db.activatePaidAccess(userId, 24);
    await bot.sendMessage(chatId,
