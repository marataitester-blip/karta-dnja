// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Функция оплаты
async function openPayment(duration) {
  const userId = tg.initDataUnsafe?.user?.id;

  if (!userId) {
    tg.showAlert('❌ Откройте приложение через Telegram бота @KartaDnyaVercelBot');
    return;
  }

  tg.MainButton.setText('Создаю счет...').show();

  try {
    const response = await fetch('/api/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId, 
        duration 
      })
    });

    const data = await response.json();

    tg.MainButton.hide();

    if (data.success && data.invoiceUrl) {
      tg.openInvoice(data.invoiceUrl, (status) => {
        if (status === 'paid') {
          tg.showAlert('✅ Оплата успешна! Обновите страницу.');
          const expiryDate = Date.now() + (duration * 60 * 60 * 1000);
          localStorage.setItem('subscriptionExpiry', expiryDate);
          localStorage.setItem('isPremium', 'true');
          setTimeout(() => window.location.reload(), 1500);
        } else if (status === 'cancelled') {
          tg.showAlert('Оплата отменена');
        } else if (status === 'failed') {
          tg.showAlert('❌ Ошибка оплаты. Попробуйте снова.');
        }
      });
    } else {
      tg.showAlert('❌ Не удалось создать счет: ' + (data.error || 'Неизвестная ошибка'));
    }
  } catch (error) {
    tg.MainButton.hide();
    console.error('Ошибка:', error);
    tg.showAlert('❌ Ошибка соединения с сервером');
  }
}

// Привязка к кнопкам при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
  // Найти кнопки по data-атрибутам или классам
  const payButtons = document.querySelectorAll('[data-payment-duration]');

  payButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const duration = parseInt(e.target.dataset.paymentDuration);
      if (duration) openPayment(duration);
    });
  });
});

// Проверка активной подписки при загрузке
async function checkSubscription() {
  const userId = tg.initDataUnsafe?.user?.id;
  if (!userId) return;

  try {
    const response = await fetch(`/api/check-subscription?userId=${userId}`);
    const data = await response.json();

    if (data.hasActiveSubscription) {
      localStorage.setItem('subscriptionExpiry', data.expiryDate);
      localStorage.setItem('isPremium', 'true');
    }
  } catch (error) {
    console.error('Ошибка проверки подписки:', error);
  }
}

checkSubscription();