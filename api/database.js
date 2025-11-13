// api/database.js
const { kv } = require('@vercel/kv');

const KEYS = {
  USER_DATA: (userId) => `user:${userId}`,
  PAYMENT: (userId, chargeId) => `payment:${userId}:${chargeId}`
};

async function getUserData(userId) {
  try {
    const data = await kv.get(KEYS.USER_DATA(userId));
    
    if (!data) {
      return {
        userId,
        freeAttempts: 5,
        firstAttemptDate: null,
        hasPaidAccess: false,
        paidAccessExpiry: null,
        totalAttempts: 0,
        lastAttemptDate: null
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
}

async function saveUserData(userId, data) {
  try {
    await kv.set(KEYS.USER_DATA(userId), data);
    return true;
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
}

async function checkUserAccess(userId) {
  const userData = await getUserData(userId);
  const now = new Date();
  
  if (userData.firstAttemptDate) {
    const firstAttempt = new Date(userData.firstAttemptDate);
    const hoursPassed = (now - firstAttempt) / (1000 * 60 * 60);
    
    if (hoursPassed >= 24) {
      userData.freeAttempts = 5;
      userData.firstAttemptDate = null;
      userData.hasPaidAccess = false;
      userData.paidAccessExpiry = null;
      await saveUserData(userId, userData);
    }
  }
  
  if (userData.hasPaidAccess && userData.paidAccessExpiry) {
    const expiry = new Date(userData.paidAccessExpiry);
    if (now < expiry) {
      return {
        hasAccess: true,
        isPaid: true,
        attemptsLeft: null,
        message: 'У вас безлимитный доступ'
      };
    } else {
      userData.hasPaidAccess = false;
      userData.paidAccessExpiry = null;
      await saveUserData(userId, userData);
    }
  }
  
  if (userData.freeAttempts > 0) {
    return {
      hasAccess: true,
      isPaid: false,
      attemptsLeft: userData.freeAttempts,
      message: `Осталось бесплатных попыток: ${userData.freeAttempts}`
    };
  }
  
  return {
    hasAccess: false,
    isPaid: false,
    attemptsLeft: 0,
    message: 'Бесплатные попытки закончились. Купите доступ на сутки за 10 ⭐'
  };
}

async function useAttempt(userId) {
  const userData = await getUserData(userId);
  const now = new Date();
  
  if (!userData.firstAttemptDate) {
    userData.firstAttemptDate = now.toISOString();
  }
  
  if (!userData.hasPaidAccess && userData.freeAttempts > 0) {
    userData.freeAttempts -= 1;
  }
  
  userData.totalAttempts += 1;
  userData.lastAttemptDate = now.toISOString();
  
  await saveUserData(userId, userData);
  return userData;
}

async function activatePaidAccess(userId, durationHours = 24) {
  const userData = await getUserData(userId);
  const now = new Date();
  
  if (!userData.firstAttemptDate) {
    userData.firstAttemptDate = now.toISOString();
  }
  
  const firstAttempt = new Date(userData.firstAttemptDate);
  const expiry = new Date(firstAttempt.getTime() + durationHours * 60 * 60 * 1000);
  
  userData.hasPaidAccess = true;
  userData.paidAccessExpiry = expiry.toISOString();
  
  await saveUserData(userId, userData);
  return userData;
}

async function savePayment(userId, chargeId, paymentData) {
  try {
    await kv.set(KEYS.PAYMENT(userId, chargeId), {
      ...paymentData,
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving payment:', error);
    throw error;
  }
}

module.exports = {
  getUserData,
  saveUserData,
  checkUserAccess,
  useAttempt,
  activatePaidAccess,
  savePayment
};
