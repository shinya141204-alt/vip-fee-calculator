// --- 変動料金テーブル (60分換算) ---
// ※ユーザー提供の10分料金を6倍して60分料金として定義
const MATCHING_FEE_TABLE = {
    weekday: {
        'open-20': 440 * 6,   // 2640円
        '20-22': 550 * 6,     // 3300円
        '22-24': 660 * 6,     // 3960円
        '24-close': 770 * 6   // 4620円
    },
    weekend: {
        'open-20': 500 * 6,   // 3000円
        '20-22': 600 * 6,     // 3600円
        '22-24': 700 * 6,     // 4200円
        '24-close': 800 * 6   // 4800円
    }
};

const CHARGE_FEE = 550;
const SPECIAL_PLAN_FEE = 5940;

// DOM Elements
const peopleInput = document.getElementById('people');
const dayTypeSelect = document.getElementById('day-type');
const timeSlotSelect = document.getElementById('time-slot');
const roomGradeSelect = document.getElementById('room-grade');
const plan1PersonCheckbox = document.getElementById('plan-1person');
const plan40sCheckbox = document.getElementById('plan-40s');

const totalPriceEl = document.getElementById('total-price');
const breakdownRoomEl = document.getElementById('breakdown-room');
const breakdownMatchingEl = document.getElementById('breakdown-matching');
const breakdownChargeEl = document.getElementById('breakdown-charge');
const resultValueContainer = document.querySelector('.result-value');

// Initialize
function init() {
    // Add event listeners
    const inputs = [peopleInput, dayTypeSelect, timeSlotSelect, roomGradeSelect, plan40sCheckbox];
    inputs.forEach(input => {
        input.addEventListener('change', handleInputChange);
        input.addEventListener('input', handleInputChange); // For number input
    });
    
    // Initial calculation
    updateRoomOptions();
    calculateFee();
}

function handleInputChange(e) {
    // Special logic for people count
    if (e.target === peopleInput) {
        let count = parseInt(peopleInput.value, 10);
        if (isNaN(count) || count < 1) {
            count = 1;
            peopleInput.value = count;
        }
        
        // Auto-check 1 person plan
        if (count === 1) {
            plan1PersonCheckbox.checked = true;
            plan40sCheckbox.disabled = true; // No need for 40s if 1 person
            plan40sCheckbox.checked = false;
        } else {
            plan1PersonCheckbox.checked = false;
            plan40sCheckbox.disabled = false;
        }
    }
    
    // Update room options if day or people changed
    if (e.target === dayTypeSelect || e.target === peopleInput) {
        updateRoomOptions();
    }
    
    calculateFee();
}

function updateRoomOptions() {
    const dayType = dayTypeSelect.value;
    const peopleCount = parseInt(peopleInput.value, 10);
    
    Array.from(roomGradeSelect.options).forEach(option => {
        const value = option.value;
        let isAvailable = true;
        
        // Check day type
        if (!value.includes(dayType)) {
            isAvailable = false;
        }
        
        // Check capacity
        if (value.includes('3300') && peopleCount > 2) isAvailable = false;
        if (value.includes('5500_weekday') && peopleCount > 4) isAvailable = false;
        if (value.includes('5500_weekend') && peopleCount > 2) isAvailable = false;
        if (value.includes('7700') && peopleCount > 4) isAvailable = false;
        if (value.includes('11000') && peopleCount > 4) isAvailable = false;
        
        option.disabled = !isAvailable;
    });
    
    // If current selected is disabled, select first available
    if (roomGradeSelect.selectedOptions[0].disabled) {
        const firstAvailable = Array.from(roomGradeSelect.options).find(opt => !opt.disabled);
        if (firstAvailable) {
            roomGradeSelect.value = firstAvailable.value;
        }
    }
}

function calculateFee() {
    const people = parseInt(peopleInput.value, 10);
    const dayType = dayTypeSelect.value;
    const timeSlot = timeSlotSelect.value;
    
    // Parse room price
    const roomValue = roomGradeSelect.value; // e.g. "3300_weekday"
    const roomPriceTotal = parseInt(roomValue.split('_')[0], 10) || 0;
    
    // 1. VIP Room per person (ceil)
    const roomPerPerson = Math.ceil(roomPriceTotal / people);
    
    // 2. Matching Fee
    let matchingFee = 0;
    if (plan1PersonCheckbox.checked || plan40sCheckbox.checked) {
        // Special Fixed Plan
        matchingFee = SPECIAL_PLAN_FEE;
    } else {
        // Normal Variable Plan
        matchingFee = MATCHING_FEE_TABLE[dayType][timeSlot];
    }
    
    // 3. Total
    const total = roomPerPerson + matchingFee + CHARGE_FEE;
    
    // Update UI
    animateValue(totalPriceEl, total);
    breakdownRoomEl.textContent = `¥${roomPerPerson.toLocaleString()}`;
    breakdownMatchingEl.textContent = `¥${matchingFee.toLocaleString()}`;
    breakdownChargeEl.textContent = `¥${CHARGE_FEE.toLocaleString()}`;
    
    // Add pulse animation
    resultValueContainer.classList.remove('pulse-update');
    void resultValueContainer.offsetWidth; // Trigger reflow
    resultValueContainer.classList.add('pulse-update');
}

function animateValue(obj, end, duration = 400) {
    let startTimestamp = null;
    const start = parseInt(obj.textContent.replace(/,/g, ''), 10) || 0;
    
    if (start === end) return;
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        obj.innerHTML = current.toLocaleString();
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end.toLocaleString();
        }
    };
    window.requestAnimationFrame(step);
}

// Start
init();
