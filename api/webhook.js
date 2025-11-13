export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Метод не разрешен' });
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const update = req.body;

  console.log('Webhook получен:', JSON.stringify(update, null, 2));

  // Обработка pre_checkout_query (обязательно!)
  if (update.pre_checkout_query) {
    const queryId = update.pre_checkout_query.id;

    try {
      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pre_checkout_query_id: queryId,
            ok: true
          })
        }
      );

      console.log('Pre-checkout подтвержден');
    } catch (error) {
      console.error('Ошибка pre-checkout:', error);
    }

    return res.status(200).json({ ok: true });
  }

  // Обработка успешного платежа
  if (update.message?.successful_payment) {
    const payment = update.message.successful_payment;
    const userId = update.message.from.id;

    try {
      const payload = JSON.parse(payment.invoice_payload);
      const { duration } = payload;

      const expiryDate = Date.now() + (duration * 60 * 60 * 1000);

      console.log(`✅ Платеж обработан: user ${userId}, до ${new Date(expiryDate)}`);

      // Отправляем подтверждение пользователю
      await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userId,
            text: `✅ Оплата прошла успешно!\n\n💎 Подписка активна до: ${new Date(expiryDate).toLocaleString('ru-RU')}\n\nТеперь можете пользоваться картами без ограничений!`,
            parse_mode: 'Markdown'
          })
        }
      );

    } catch (error) {
      console.error('Ошибка обработки платежа:', error);
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
}