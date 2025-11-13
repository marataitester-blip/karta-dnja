// Access Control System for Tarot App
// Integrates with Telegram Stars monetization

(function() {
    // Configuration
    const API_BASE = '/api';
    const FREE_ATTEMPTS = 5;

        // LocalStorage functions
    const STORAGE_KEY = 'tarotAppAccess';
    
    function saveToStorage(data) {
        try {
            const storageData = {
                ...data,
                lastUpdate: new Date().toISOString(),
                date: new Date().toDateString()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
        }
    }
    
    function loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;
            
            const data = JSON.parse(stored);
            const today = new Date().toDateString();
            
            // Reset attempts if it's a new day
            if (data.date !== today) {
                return {
                    ...data,
                    attemptsLeft: FREE_ATTEMPTS,
                    date: today,
                    isPaid: false // Reset paid status daily
                };
            }
            
            return data;
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return null;
        }
    }
    
    // State
    let userAccesloadFromStorage() || {
        userId: null,
        hasAccess: true,
        isPaid: false,
        attemptsLeft: FREE_ATTEMPTS
    };
    
    // Get Telegram WebApp user ID
    function getTelegramUserId() {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            const user = window.Telegram.WebApp.initDataUnsafe.user;
            return user ? user.id : null;
        }
        return null;
    }
    
    // Check user access from API
    async function checkAccess() {
        const userId = getTelegramUserId();
        
        if (!userId) {
            console.warn('No Telegram user ID found - running in demo mode');
            updateUI();
            return;
        }
        
        userAccess.userId = userId;
        
        try {
            const response = await fetch(`${API_BASE}/check-access?userId=${userId}`);
            const data = await response.json();
            
            userAccess.hasAccess = data.hasAccess;
            userAccess.isPaid = data.isPaid;
            userAccess.attemptsLeft = data.attemptsLeft;
                    saveToStorage(userAccess);
            
            updateUI();
            
            if (!data.hasAccess) {
                disableDrawing();
            }
        } catch (error) {
            console.error('Error checking access:', error);
            // On error, allow access (fail open)
            updateUI();
        }
    }
    
    // Record attempt after card draw
    async function recordAttempt() {
        const userId = getTelegramUserId();
        
        if (!userId) {
            return; // Demo mode, don't record
        }
        
        try {
            await fetch(`${API_BASE}/use-attempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            
            // Decrease local counter
            if (userAccess.attemptsLeft > 0) {
                userAccess.attemptsLeft--;
                        saveToStorage(userAccess);
            }
            
            // Check if limit reached
            if (userAccess.attemptsLeft <= 0 && !userAccess.isPaid) {
                userAccess.hasAccess = false;
                disableDrawing();
            }
            
            updateUI();
        } catch (error) {
            console.error('Error recording attempt:', error);
        }
    }
    
    // Update UI to show access status
    function updateUI() {
        const accessInfo = document.getElementById('access-info');
        const attemptsText = document.getElementById('attempts-text');
        const paymentBlock = document.getElementById('payment-block');
        
        if (!accessInfo || !attemptsText || !paymentBlock) {
            return; // UI elements not ready yet
        }
        
        if (userAccess.isPaid) {
            // User has paid - show unlimited access message
            accessInfo.style.display = 'block';
            attemptsText.textContent = '✨ У вас безлимитный доступ на 24 часа';
            attemptsText.style.color = 'var(--accent)';
            paymentBlock.style.display = 'none';
        } else if (!userAccess.hasAccess) {
            // No access - show payment prompt
            accessInfo.style.display = 'none';
            paymentBlock.style.display = 'block';
        } else {
            // Show remaining attempts
            accessInfo.style.display = 'block';
            attemptsText.textContent = `Осталось попыток сегодня: ${userAccess.attemptsLeft} из ${FREE_ATTEMPTS}`;
            attemptsText.style.color = userAccess.attemptsLeft <= 2 ? '#ff6b6b' : 'var(--accent)';
            paymentBlock.style.display = 'none';
        }
    }
    
    // Disable drawing functionality
    function disableDrawing() {
        const drawButton = document.getElementById('draw-btn');
        if (drawButton) {
            drawButton.disabled = true;
            drawButton.style.opacity = '0.5';
            drawButton.style.cursor = 'not-allowed';
        }
    }
    
    // Hook into the existing drawCard function
    function hookDrawCard() {
        const drawButton = document.getElementById('draw-btn');
        if (!drawButton) {
            return;
        }
        
        // Store the original draw function
        const originalOnClick = drawButton.onclick;
        
        // Replace with our wrapper
        drawButton.onclick = function(event) {
            // Check if user has access
            if (!userAccess.hasAccess) {
                event.preventDefault();
                alert('Лимит исчерпан. Пожалуйста, оплатите доступ.');
                return false;
            }
            
            // Call original function
            if (originalOnClick) {
                originalOnClick.call(this, event);
            }
            
            // Record attempt after successful draw
            if (!userAccess.isPaid) {
                setTimeout(() => {
                    recordAttempt();
                }, 500);
            }
        };
    }
    
    // Initialize when DOM is ready
    function init() {
        // Wait for Telegram WebApp to be ready
        if (window.Telegram && window.Telegram.WebApp) {
            window.Telegram.WebApp.ready();
        }
        
        // Check access
        checkAccess();
        
        // Hook into draw button
        hookDrawCard();
    }
    
    // Run initialization when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Export for debugging
    window.TarotAccessControl = {
        checkAccess,
        recordAttempt,
        getStatus: () => userAccess
    };
})();
