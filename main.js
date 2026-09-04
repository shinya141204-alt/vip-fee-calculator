// --- 店舗別設定データ ---
// 新しい店舗を追加する場合は、このオブジェクト内に店舗データを追加してください。
const STORE_CONFIGS = {
    'store-a': {
        name: 'A店 (現在の設定)',
        matchingFee: {
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
            weekday: {
                'open-20': 2000,
                '20-22': 3000,
                '22-24': 4000,
                '24-close': 5000
            },
            weekend: {
                'open-20': 3000,
                '20-22': 4000,
                '22-24': 5000,
                '24-close': 6000
            }
        },
        vipRooms: [
            { id: '4000_all', name: '全日 4,000円 (2名まで)', price: 4000, maxPeople: 2, dayTypes: ['weekday', 'weekend'] },
            { id: '8000_all', name: '全日 8,000円 (6名まで)', price: 8000, maxPeople: 6, dayTypes: ['weekday', 'weekend'] },
            { id: '15000_weekend', name: '週末特別 15,000円 (8名まで)', price: 15000, maxPeople: 8, dayTypes: ['weekend'] }
        ]
    }
};

const CHARGE_FEE = 550;
const SPECIAL_PLAN_FEE = 5940;

// DOM Elements
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

// Initialize
function init() {
    // 1. 店舗の選択肢を初期化
    storeSelect.innerHTML = '';
    Object.keys(STORE_CONFIGS).forEach(storeId => {
        const option = document.createElement('option');
        option.value = storeId;
        option.textContent = STORE_CONFIGS[storeId].name;
        storeSelect.appendChild(option);
    });

    // 2. イベントリスナーの設定
    const inputs = [storeSelect, peopleInput, dayTypeSelect, timeSlotSelect, roomGradeSelect, plan40sCheckbox];
    inputs.forEach(input => {
        input.addEventListener('change', handleInputChange);
        input.addEventListener('input', handleInputChange); // For number input
    });
    
    // 3. 初期計算
    updateRoomOptions();
    calculateFee();
}

function handleInputChange(e) {
    // 人数入力の特殊処理
    if (e.target === peopleInput) {
        let count = parseInt(peopleInput.value, 10);
        if (isNaN(count) || count < 1) {
            count = 1;
        }
        
        // 1名様プランの自動制御
        if (count === 1) {
            plan1PersonCheckbox.checked = true;
            plan40sCheckbox.disabled = true; // 1名の場合は40代プランの意味がないため無効化
            plan40sCheckbox.checked = false;
        } else {
            plan1PersonCheckbox.checked = false;
            plan40sCheckbox.disabled = false;
        }
    }
    
    // 店舗、曜日、人数が変わった場合はVIPルームの選択肢を再生成/更新
    if (e.target === storeSelect || e.target === dayTypeSelect || e.target === peopleInput) {
        updateRoomOptions();
    }
    
    calculateFee();
}

// 店舗設定、曜日、人数に基づいてVIPルームの選択肢を動的生成・制御
function updateRoomOptions() {
    const storeId = storeSelect.value;
    const storeConfig = STORE_CONFIGS[storeId];
    const dayType = dayTypeSelect.value;
    let peopleCount = parseInt(peopleInput.value, 10);
    if (isNaN(peopleCount) || peopleCount < 1) peopleCount = 1;
    
    // 現在選択されているルームIDを保持（店舗切り替え時はリセットされる可能性あり）
    const currentSelectedRoomId = roomGradeSelect.value;
    
    roomGradeSelect.innerHTML = '';
    
    let hasAvailableOption = false;
    let firstAvailableOptionValue = null;

    storeConfig.vipRooms.forEach(room => {
        const option = document.createElement('option');
        option.value = room.id;
        option.textContent = room.name;
        
        let isAvailable = true;
        
        // 曜日チェック
        if (!room.dayTypes.includes(dayType)) {
            isAvailable = false;
        }
        
        // 定員チェック
        if (peopleCount > room.maxPeople) {
            isAvailable = false;
        }
        
        option.disabled = !isAvailable;
        roomGradeSelect.appendChild(option);

        if (isAvailable && !firstAvailableOptionValue) {
            firstAvailableOptionValue = room.id;
        }
        if (isAvailable && room.id === currentSelectedRoomId) {
            hasAvailableOption = true;
        }
    });
    
    // もし前回選択していたルームが現在有効ならそのまま選択、無効なら最初の有効なルームを選択
    if (hasAvailableOption) {
        roomGradeSelect.value = currentSelectedRoomId;
    } else if (firstAvailableOptionValue) {
        roomGradeSelect.value = firstAvailableOptionValue;
    }
}

function calculateFee() {
    const storeId = storeSelect.value;
    const storeConfig = STORE_CONFIGS[storeId];
    const dayType = dayTypeSelect.value;
    const timeSlot = timeSlotSelect.value;
    let people = parseInt(peopleInput.value, 10);
    if (isNaN(people) || people < 1) people = 1;
    
    // 1. VIPルーム割勘（1人あたり、端数切り上げ）
    const roomId = roomGradeSelect.value;
    const selectedRoom = storeConfig.vipRooms.find(r => r.id === roomId);
    const roomPriceTotal = selectedRoom ? selectedRoom.price : 0;
    const roomPerPerson = Math.ceil(roomPriceTotal / people);
    
    // 2. 相席料金 (60分)
    let matchingFee = 0;
    if (plan1PersonCheckbox.checked || plan40sCheckbox.checked) {
        // 特殊固定プラン
        matchingFee = SPECIAL_PLAN_FEE;
    } else {
        // 通常の変動プラン（選択された店舗の設定から取得）
        matchingFee = storeConfig.matchingFee[dayType][timeSlot] || 0;
    }
    
    // 3. 総額
    const total = roomPerPerson + matchingFee + CHARGE_FEE;
    
    // UI反映
    animateValue(totalPriceEl, total);
    breakdownRoomEl.textContent = `¥${roomPerPerson.toLocaleString()}`;
    breakdownMatchingEl.textContent = `¥${matchingFee.toLocaleString()}`;
    breakdownChargeEl.textContent = `¥${CHARGE_FEE.toLocaleString()}`;
    
    // 更新アニメーション
    resultValueContainer.classList.remove('pulse-update');
    void resultValueContainer.offsetWidth; // Reflow
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
