// Access Control System for Tarot App
(function() {
    'use strict';

    const DAILY_FREE_LIMIT = 5;
    const STORAGE_KEY = 'tarot_access';

    // Get Telegram user ID
    function getUserId() {
        const tg = window.Telegram?.WebApp;
        return tg?.initDataUnsafe?.user?.id || 'guest';
    }

    // Get today's date string
    function getTodayKey() {
        const now = new Date();
        return now.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Load access data from localStorage
    function loadAccessData() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error loading access data:', e);
            return {};
        }
    }

    // Save access data to localStorage
    function saveAccessData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving access data:', e);
        }
    }

    // Check if user has premium access
    function hasPremiumAccess() {
        const data = loadAccessData();
        const userId = getUserId();
        const userAccess = data[userId];

        if (!userAccess || !userAccess.premium) {
            return false;
        }

        // Check if premium is still valid
        const now = Date.now();
        if (userAccess.premiumExpiry && userAccess.premiumExpiry > now) {
            return true;
        }

        return false;
    }

    // Get remaining free attempts for today
    function getRemainingAttempts() {
        if (hasPremiumAccess()) {
            return Infinity; // Unlimited for premium
        }

        const data = loadAccessData();
        const userId = getUserId();
        const today = getTodayKey();
        const userAccess = data[userId];

        if (!userAccess || userAccess.lastDate !== today) {
            return DAILY_FREE_LIMIT; // Reset for new day
        }

        return Math.max(0, DAILY_FREE_LIMIT - (userAccess.attempts || 0));
    }

    // Record an attempt
    function recordAttempt() {
        if (hasPremiumAccess()) {
            return true; // Premium users have unlimited access
        }

        const data = loadAccessData();
        const userId = getUserId();
        const today = getTodayKey();

        if (!data[userId]) {
            data[userId] = {};
        }

        // Reset if new day
        if (data[userId].lastDate !== today) {
            data[userId].attempts = 0;
            data[userId].lastDate = today;
        }

        // Check limit
        if (data[userId].attempts >= DAILY_FREE_LIMIT) {
            return false; // Limit reached
        }

        // Increment attempts
        data[userId].attempts = (data[userId].attempts || 0) + 1;
        saveAccessData(data);

        return true;
    }

    // Update UI based on access
    function updateUI() {
        const remaining = getRemainingAttempts();
        const isPremium = hasPremiumAccess();

        const attemptsText = document.getElementById('attempts-text');
        const paymentBlock = document.getElementById('payment-block');
        const drawBtn = document.getElementById('draw-btn');
        const accessInfo = document.getElementById('access-info');

        if (isPremium) {
            if (attemptsText) {
                attemptsText.textContent = '⭐ Премиум доступ активен';
            }
            if (paymentBlock) {
                paymentBlock.style.display = 'none';
            }
            if (drawBtn) {
                drawBtn.disabled = false;
            }
            if (accessInfo) {
                accessInfo.style.display = 'block';
            }
        } else if (remaining > 0) {
            if (attemptsText) {
                attemptsText.textContent = `Осталось бесплатных попыток: ${remaining}/5`;
            }
            if (paymentBlock) {
                paymentBlock.style.display = 'none';
            }
            if (drawBtn) {
                drawBtn.disabled = false;
            }
            if (accessInfo) {
                accessInfo.style.display = 'block';
            }
        } else {
            if (attemptsText) {
                attemptsText.textContent = 'Лимит исчерпан на сегодня';
            }
            if (paymentBlock) {
                paymentBlock.style.display = 'block';
            }
            if (drawBtn) {
                drawBtn.disabled = true;
            }
            if (accessInfo) {
                accessInfo.style.display = 'block';
            }
        }
    }

    // Override draw button click
    function setupAccessControl() {
        const originalDrawBtn = document.getElementById('draw-btn');

        if (originalDrawBtn) {
            const originalOnClick = originalDrawBtn.onclick;

            originalDrawBtn.addEventListener('click', function(e) {
                const remaining = getRemainingAttempts();

                if (remaining === 0 && !hasPremiumAccess()) {
                    e.preventDefault();
                    e.stopPropagation();

                    const tg = window.Telegram?.WebApp;
                    if (tg && tg.showAlert) {
                        tg.showAlert('Вы использовали все 5 бесплатных попыток сегодня. Оплатите доступ для продолжения.');
                    } else {
                        alert('Вы использовали все 5 бесплатных попыток сегодня.');
                    }

                    return false;
                }

                // Record the attempt
                if (!recordAttempt()) {
                    e.preventDefault();
                    return false;
                }

                // Update UI after attempt
                setTimeout(updateUI, 100);
            }, true);
        }
    }

    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            updateUI();
            setupAccessControl();
        });
    } else {
        updateUI();
        setupAccessControl();
    }

    // Expose functions globally for payment integration
    window.TarotAccessControl = {
        getRemainingAttempts: getRemainingAttempts,
        hasPremiumAccess: hasPremiumAccess,
        updateUI: updateUI,
        recordAttempt: recordAttempt,
        setPremiumAccess: function(expiryTimestamp) {
            const data = loadAccessData();
            const userId = getUserId();

            if (!data[userId]) {
                data[userId] = {};
            }

            data[userId].premium = true;
            data[userId].premiumExpiry = expiryTimestamp;

            saveAccessData(data);
            updateUI();
        }
    };

})();