// --- 店舗別設定データ (デフォルト値) ---
const DEFAULT_STORE_CONFIGS = {
    'store-a': {
        name: 'A店 (現在の設定)',
        matchingFee: {
            weekday: { 'open-20': 440 * 6, '20-22': 550 * 6, '22-24': 660 * 6, '24-close': 770 * 6 },
            weekend: { 'open-20': 500 * 6, '20-22': 600 * 6, '22-24': 700 * 6, '24-close': 800 * 6 }
        },
        vipRooms: [
            { id: '3300_weekday', name: '平日 3,300円 (2名まで)', price: 3300, maxPeople: 2, dayTypes: ['weekday'] },
            { id: '5500_weekday', name: '平日 5,500円 (4名まで)', price: 5500, maxPeople: 4, dayTypes: ['weekday'] },
            { id: '5500_weekend', name: '週末 5,500円 (2名まで)', price: 5500, maxPeople: 2, dayTypes: ['weekend'] },
            { id: '7700_weekend', name: '週末 7,700円 (4名まで)', price: 7700, maxPeople: 4, dayTypes: ['weekend'] },
            { id: '11000_weekend', name: '週末 11,000円 (4名まで)', price: 11000, maxPeople: 4, dayTypes: ['weekend'] }
        ]
    },
    'store-b': {
        name: 'B店 (ダミーテスト用)',
        matchingFee: {
            weekday: { 'open-20': 2000, '20-22': 3000, '22-24': 4000, '24-close': 5000 },
            weekend: { 'open-20': 3000, '20-22': 4000, '22-24': 5000, '24-close': 6000 }
        },
        vipRooms: [
            { id: '4000_all', name: '全日 4,000円 (2名まで)', price: 4000, maxPeople: 2, dayTypes: ['weekday', 'weekend'] },
            { id: '8000_all', name: '全日 8,000円 (6名まで)', price: 8000, maxPeople: 6, dayTypes: ['weekday', 'weekend'] },
            { id: '15000_weekend', name: '週末特別 15,000円 (8名まで)', price: 15000, maxPeople: 8, dayTypes: ['weekend'] }
        ]
    }
};

let STORE_CONFIGS = JSON.parse(JSON.stringify(DEFAULT_STORE_CONFIGS));

// ローカルストレージから設定を読み込む
try {
    const saved = localStorage.getItem('vipFeeConfigs');
    if (saved) {
        STORE_CONFIGS = JSON.parse(saved);
    }
} catch (e) {
    console.error('Failed to load configs from localStorage', e);
}

const CHARGE_FEE = 550;
const SPECIAL_PLAN_FEE = 5940;

// --- DOM Elements (Main) ---
const storeSelect = document.getElementById('store-select');
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

// --- DOM Elements (Settings) ---
const modal = document.getElementById('settings-modal');
const openSettingsBtn = document.getElementById('open-settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const editStoreSelect = document.getElementById('edit-store-select');
const editStoreName = document.getElementById('edit-store-name');
const vipRoomsContainer = document.getElementById('vip-rooms-container');
const addVipRoomBtn = document.getElementById('add-vip-room-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const resetSettingsBtn = document.getElementById('reset-settings-btn');

const timeKeys = ['open-20', '20-22', '22-24', '24-close'];
const feeInputs = {
    weekday: [
        document.getElementById('fee-wd-1'), document.getElementById('fee-wd-2'),
        document.getElementById('fee-wd-3'), document.getElementById('fee-wd-4')
    ],
    weekend: [
        document.getElementById('fee-we-1'), document.getElementById('fee-we-2'),
        document.getElementById('fee-we-3'), document.getElementById('fee-we-4')
    ]
};

// Initialize Main UI
function initMain() {
    storeSelect.innerHTML = '';
    Object.keys(STORE_CONFIGS).forEach(storeId => {
        const option = document.createElement('option');
        option.value = storeId;
        option.textContent = STORE_CONFIGS[storeId].name;
        storeSelect.appendChild(option);
    });

    updateRoomOptions();
    calculateFee();
}

// Event Listeners (Main)
const inputs = [storeSelect, peopleInput, dayTypeSelect, timeSlotSelect, roomGradeSelect, plan40sCheckbox];
inputs.forEach(input => {
    input.addEventListener('change', handleInputChange);
    input.addEventListener('input', handleInputChange);
});

function handleInputChange(e) {
    if (e.target === peopleInput) {
        let count = parseInt(peopleInput.value, 10);
        if (isNaN(count) || count < 1) count = 1;
        if (count === 1) {
            plan1PersonCheckbox.checked = true;
            plan40sCheckbox.disabled = true;
            plan40sCheckbox.checked = false;
        } else {
            plan1PersonCheckbox.checked = false;
            plan40sCheckbox.disabled = false;
        }
    }
    
    if (e.target === storeSelect || e.target === dayTypeSelect || e.target === peopleInput) {
        updateRoomOptions();
    }
    calculateFee();
}

function updateRoomOptions() {
    const storeId = storeSelect.value;
    if (!storeId || !STORE_CONFIGS[storeId]) return;
    const storeConfig = STORE_CONFIGS[storeId];
    const dayType = dayTypeSelect.value;
    let peopleCount = parseInt(peopleInput.value, 10) || 1;
    
    const currentSelectedRoomId = roomGradeSelect.value;
    roomGradeSelect.innerHTML = '';
    
    let hasAvailableOption = false;
    let firstAvailableOptionValue = null;

    storeConfig.vipRooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        
        let isAvailable = true;
        if (!room.dayTypes.includes(dayType)) isAvailable = false;
        if (peopleCount > room.maxPeople) isAvailable = false;
        
        option.disabled = !isAvailable;
        roomGradeSelect.appendChild(option);

        if (isAvailable && !firstAvailableOptionValue) firstAvailableOptionValue = room.id;
        if (isAvailable && room.id === currentSelectedRoomId) hasAvailableOption = true;
    });
    
    if (hasAvailableOption) {
        roomGradeSelect.value = currentSelectedRoomId;
    } else if (firstAvailableOptionValue) {
        roomGradeSelect.value = firstAvailableOptionValue;
    }
}

function calculateFee() {
    const storeId = storeSelect.value;
    if (!storeId || !STORE_CONFIGS[storeId]) return;
    const storeConfig = STORE_CONFIGS[storeId];
    const dayType = dayTypeSelect.value;
    const timeSlot = timeSlotSelect.value;
    let people = parseInt(peopleInput.value, 10) || 1;
    
    const roomId = roomGradeSelect.value;
    const selectedRoom = storeConfig.vipRooms.find(r => r.id === roomId);
    const roomPriceTotal = selectedRoom ? selectedRoom.price : 0;
    const roomPerPerson = Math.ceil(roomPriceTotal / people);
    
    let matchingFee = 0;
    if (plan1PersonCheckbox.checked || plan40sCheckbox.checked) {
        matchingFee = SPECIAL_PLAN_FEE;
    } else {
        matchingFee = storeConfig.matchingFee[dayType][timeSlot] || 0;
    }
    
    const total = roomPerPerson + matchingFee + CHARGE_FEE;
    
    animateValue(totalPriceEl, total);
    breakdownRoomEl.textContent = `¥${roomPerPerson.toLocaleString()}`;
    breakdownMatchingEl.textContent = `¥${matchingFee.toLocaleString()}`;
    breakdownChargeEl.textContent = `¥${CHARGE_FEE.toLocaleString()}`;
    
    resultValueContainer.classList.remove('pulse-update');
    void resultValueContainer.offsetWidth;
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
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerHTML = end.toLocaleString();
    };
    window.requestAnimationFrame(step);
}


// --- Settings Logic ---

// Open Modal
openSettingsBtn.addEventListener('click', () => {
    populateSettingsSelect();
    loadStoreToForm(editStoreSelect.value);
    modal.showModal();
});

// Close Modal
closeSettingsBtn.addEventListener('click', () => {
    modal.close();
});

// Change Store in Settings
editStoreSelect.addEventListener('change', (e) => {
    loadStoreToForm(e.target.value);
});

function populateSettingsSelect() {
    editStoreSelect.innerHTML = '';
    Object.keys(STORE_CONFIGS).forEach(storeId => {
        const option = document.createElement('option');
        option.value = storeId;
        option.textContent = STORE_CONFIGS[storeId].name;
        editStoreSelect.appendChild(option);
    });
}

function loadStoreToForm(storeId) {
    if (!STORE_CONFIGS[storeId]) return;
    const config = STORE_CONFIGS[storeId];
    
    // Store Name
    editStoreName.value = config.name;
    
    // Matching Fees
    timeKeys.forEach((key, index) => {
        feeInputs.weekday[index].value = config.matchingFee.weekday[key];
        feeInputs.weekend[index].value = config.matchingFee.weekend[key];
    });
    
    // VIP Rooms (GUI)
    vipRoomsContainer.innerHTML = '';
    config.vipRooms.forEach(room => {
        addVipRoomForm(room);
    });
}

function addVipRoomForm(room = { name: '', price: 0, maxPeople: 2, dayTypes: ['weekday', 'weekend'] }) {
    const card = document.createElement('div');
    card.className = 'vip-room-card';
    
    // UUID for unique ID if missing
    const roomId = room.id || 'room_' + Math.random().toString(36).substr(2, 9);
    card.dataset.roomId = roomId;

    let dayTypeHtml = `
        <select class="room-dayTypes">
            <option value="weekday" ${room.dayTypes.includes('weekday') && !room.dayTypes.includes('weekend') ? 'selected' : ''}>平日のみ</option>
            <option value="weekend" ${!room.dayTypes.includes('weekday') && room.dayTypes.includes('weekend') ? 'selected' : ''}>週末のみ</option>
            <option value="all" ${room.dayTypes.includes('weekday') && room.dayTypes.includes('weekend') ? 'selected' : ''}>全日 (平日・週末)</option>
        </select>
    `;

    card.innerHTML = `
        <button type="button" class="remove-room-btn" aria-label="削除">&times;</button>
        <div class="vip-room-card-grid">
            <div class="full-width">
                <label>部屋名</label>
                <input type="text" class="room-name" value="${room.name}" placeholder="例: 平日 3,300円 (2名まで)">
            </div>
            <div>
                <label>価格 (円)</label>
                <input type="number" class="room-price" value="${room.price}" inputmode="numeric">
            </div>
            <div>
                <label>定員 (名)</label>
                <input type="number" class="room-maxPeople" value="${room.maxPeople}" inputmode="numeric">
            </div>
            <div class="full-width">
                <label>適用曜日</label>
                ${dayTypeHtml}
            </div>
        </div>
    `;

    // 削除ボタンのイベント
    card.querySelector('.remove-room-btn').addEventListener('click', () => {
        card.remove();
    });

    vipRoomsContainer.appendChild(card);
}

addVipRoomBtn.addEventListener('click', () => {
    addVipRoomForm();
});

// Save Settings
saveSettingsBtn.addEventListener('click', () => {
    const storeId = editStoreSelect.value;
    if (!STORE_CONFIGS[storeId]) return;
    
        // Extract VIP Rooms from DOM
        const newVipRooms = [];
        const roomCards = vipRoomsContainer.querySelectorAll('.vip-room-card');
        roomCards.forEach(card => {
            const id = card.dataset.roomId;
            const name = card.querySelector('.room-name').value || '名称未設定';
            const price = parseInt(card.querySelector('.room-price').value, 10) || 0;
            const maxPeople = parseInt(card.querySelector('.room-maxPeople').value, 10) || 1;
            const dayTypeVal = card.querySelector('.room-dayTypes').value;
            
            let dayTypes = [];
            if (dayTypeVal === 'weekday') dayTypes = ['weekday'];
            else if (dayTypeVal === 'weekend') dayTypes = ['weekend'];
            else dayTypes = ['weekday', 'weekend'];

            newVipRooms.push({ id, name, price, maxPeople, dayTypes });
        });

    // Update Name
    STORE_CONFIGS[storeId].name = editStoreName.value;
    
    // Update Fees
    timeKeys.forEach((key, index) => {
        STORE_CONFIGS[storeId].matchingFee.weekday[key] = parseInt(feeInputs.weekday[index].value, 10) || 0;
        STORE_CONFIGS[storeId].matchingFee.weekend[key] = parseInt(feeInputs.weekend[index].value, 10) || 0;
    });
    
    // Update VIP Rooms
    STORE_CONFIGS[storeId].vipRooms = newVipRooms;
    
    // Save to localStorage
    localStorage.setItem('vipFeeConfigs', JSON.stringify(STORE_CONFIGS));
    
    alert('設定を保存しました。');
    modal.close();
    
    // Re-init main UI to reflect changes
    initMain();
});

// Reset Settings
resetSettingsBtn.addEventListener('click', () => {
    if (confirm('すべての設定を初期状態（デフォルト）に戻しますか？\n※現在保存されている変更はすべて破棄されます。')) {
        localStorage.removeItem('vipFeeConfigs');
        STORE_CONFIGS = JSON.parse(JSON.stringify(DEFAULT_STORE_CONFIGS));
        
        alert('初期設定にリセットしました。');
        modal.close();
        
        initMain();
    }
});


// Start
initMain();
