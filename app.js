// Delivery Diet MVP - Core Logic
const STORAGE_KEY = 'delivery_diet_data';
const REFUSAL_AMOUNT = 20000; // 1 refusal = 20,000 KRW

// Alternative suggestion list (20 items)
const alternativeActions = [
  { emoji: "💧", text: "시원한 물 한 잔 가득 마시며 가짜 배고픔인지 체크해봐요." },
  { emoji: "🚶", text: "5분 동안 동네 한 바퀴를 가볍게 걸으며 머리를 식혀보세요." },
  { emoji: "🍎", text: "냉장고에 든 토마토나 과일을 조금 깎아 먹으며 허기를 달래보세요." },
  { emoji: "🥛", text: "따뜻하게 데운 우유나 두유 한 잔을 천천히 음미해보세요." },
  { emoji: "🔍", text: "냉장고 문을 열고 곧바로 먹거나 쉽게 조리할 수 있는 반찬을 찾으세요." },
  { emoji: "🍜", text: "정말 힘들다면 배달 대신 집에서 라면이나 냉동 만두를 조리해보세요." },
  { emoji: "🧘", text: "바른 자세로 앉아 눈을 감고 2분간 깊게 심호흡하며 앱을 꺼보세요." },
  { emoji: "🧹", text: "방 안을 청소하거나 이불을 개며 주의를 다른 곳으로 돌려보세요." },
  { emoji: "🦷", text: "화장실로 가 상쾌한 민트 치약으로 양치질을 해서 식욕을 리셋해보세요." },
  { emoji: "📱", text: "가족이나 오랜 친구에게 전화를 걸어 안부를 나누며 기분을 전환하세요." },
  { emoji: "🎮", text: "간단한 두뇌 퍼즐이나 모바일 미니 게임을 딱 5분간만 즐겨보세요." },
  { emoji: "🎧", text: "제일 좋아하는 신나는 노래 2곡을 연속으로 들으며 춤추듯 움직여보세요." },
  { emoji: "📚", text: "눈길이 가던 책이나 소설, 웹툰을 딱 10페이지 정보만 집중해서 읽어봐요." },
  { emoji: "🛒", text: "배달 앱 장바구니에 담은 음식이 과연 그만한 가치가 있는지 생각해봐요." },
  { emoji: "🥤", text: "냉장고 속 탄산수나 제로 칼로리 탄산음료를 마셔 톡 쏘는 청량감을 즐겨요." },
  { emoji: "🥱", text: "잠시 침대에 엎드려 편안한 유튜브 쇼츠 영상 2~3개를 멍하니 보세요." },
  { emoji: "💪", text: "가벼운 국민체조나 스쿼트 15회로 온몸에 혈액순환을 시켜보세요." },
  { emoji: "💅", text: "손톱을 보기 좋게 깎거나 촉촉한 핸드크림을 바르며 기분을 케어해보세요." },
  { emoji: "📝", text: "오늘 참아서 아낀 2만 원으로 살 수 있는 나만의 소박한 보상 목록을 적어봐요." },
  { emoji: "☕", text: "집에 있는 따뜻한 둥굴레차나 믹스커피 한 잔을 천천히 타서 마셔보세요." }
];

// App State
let state = {
  streak: 0,
  totalSaved: 0,
  todaySaved: 0,
  todayCount: 0,
  lastSuccessDate: null,
  successCount: 0,
  history: [],
  savingGoal: 200000,
  theme: 'light'
};

// Date Utility Helpers
function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayString(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateOffsetString(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate Streak dynamically based on dates in history
function calculateStreakFromHistory(historyList) {
  if (!historyList || historyList.length === 0) return 0;
  
  // Extract unique dates and sort them descending
  const uniqueDates = [...new Set(historyList.map(item => item.date))].sort().reverse();
  if (uniqueDates.length === 0) return 0;
  
  const today = getTodayString();
  const yesterday = getYesterdayString(today);
  
  let currentStreak = 0;
  let checkDate = null;
  
  // If today has success, start check from today. Otherwise from yesterday.
  if (uniqueDates.includes(today)) {
    checkDate = today;
  } else if (uniqueDates.includes(yesterday)) {
    checkDate = yesterday;
  } else {
    // Break in streak (last success older than yesterday)
    return 0;
  }
  
  // Walk backwards to count consecutive days
  while (uniqueDates.includes(checkDate)) {
    currentStreak++;
    checkDate = getYesterdayString(checkDate);
  }
  
  return currentStreak;
}

// Recalculate all metrics based on history records
function recalculateStats() {
  const todayStr = getTodayString();
  
  // 1. Total Refusal Saved
  state.totalSaved = state.history.reduce((sum, item) => sum + item.amount, 0);
  
  // 2. Success Count
  state.successCount = state.history.length;
  
  // 3. Today Refusal Stats
  const todayItems = state.history.filter(item => item.date === todayStr);
  state.todaySaved = todayItems.reduce((sum, item) => sum + item.amount, 0);
  state.todayCount = todayItems.length;
  
  // 4. Streak Calculation
  state.streak = calculateStreakFromHistory(state.history);
  
  // 5. Update lastSuccessDate
  const uniqueSorted = [...new Set(state.history.map(item => item.date))].sort().reverse();
  state.lastSuccessDate = uniqueSorted.length > 0 ? uniqueSorted[0] : null;
}

// Pre-populate realistic 4-day streak up to yesterday to show dynamic working states
function initializeMockData() {
  const yesterday = getYesterdayString(getTodayString());
  const d2 = getYesterdayString(yesterday);
  const d3 = getYesterdayString(d2);
  const d4 = getYesterdayString(d3);
  
  state.history = [
    { id: Date.now() - 400000000, date: d4, amount: REFUSAL_AMOUNT, alternative: "시원한 물 한 잔 가득 마시며 가짜 배고픔인지 체크해봐요." },
    { id: Date.now() - 300000000, date: d3, amount: REFUSAL_AMOUNT, alternative: "5분 동안 동네 한 바퀴를 가볍게 걸어보기" },
    { id: Date.now() - 200000000, date: d2, amount: REFUSAL_AMOUNT, alternative: "냉장고 속의 신선한 과일 꺼내 먹기" },
    { id: Date.now() - 100000000, date: yesterday, amount: REFUSAL_AMOUNT, alternative: "따뜻한 우유 한 잔 마시기" }
  ];
  state.savingGoal = 200000;
  state.theme = 'light';
  
  recalculateStats();
  saveState();
}

// Load state from local storage
function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      state = JSON.parse(stored);
      // Fallbacks for empty properties
      if (!state.history) state.history = [];
      if (!state.savingGoal) state.savingGoal = 200000;
      if (!state.theme) state.theme = 'light';
      
      // Auto recalculate stats to avoid timezone issues or system calendar changes
      recalculateStats();
    } catch (e) {
      console.error('Failed to parse local storage, loading mock.', e);
      initializeMockData();
    }
  } else {
    initializeMockData();
  }
}

// Save state to local storage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// DOM elements
const streakCountEl = document.getElementById('streakCount');
const streakEmojiEl = document.getElementById('streakEmoji');
const totalSavedTextEl = document.getElementById('totalSavedText');
const todaySavedTextEl = document.getElementById('todaySavedText');
const todayCountEl = document.getElementById('todayCount');
const progressPercentEl = document.getElementById('progressPercent');
const progressFillEl = document.getElementById('progressFill');
const progressCurrentEl = document.getElementById('progressCurrent');
const progressGoalEl = document.getElementById('progressGoal');
const goalTextBtnEl = document.getElementById('goalTextBtn');
const goalInputWrapperEl = document.getElementById('goalInputWrapper');
const goalInputEl = document.getElementById('goalInput');
const saveGoalBtnEl = document.getElementById('saveGoalBtn');
const successBtnEl = document.getElementById('successBtn');
const refreshAltBtnEl = document.getElementById('refreshAltBtn');
const altEmojiEl = document.getElementById('altEmoji');
const altTextEl = document.getElementById('altText');
const historyListEl = document.getElementById('historyList');
const noHistoryMsgEl = document.getElementById('noHistoryMsg');
const resetDataBtnEl = document.getElementById('resetDataBtn');
const themeToggleBtnEl = document.getElementById('themeToggleBtn');

// Badge elements
const badgeFirstEl = document.getElementById('badge-first');
const badgeStreak3El = document.getElementById('badge-streak3');
const badgeStreak7El = document.getElementById('badge-streak7');
const badgeStreak30El = document.getElementById('badge-streak30');

// Format number to local currency format
function formatKRW(val) {
  return val.toLocaleString('ko-KR');
}

// Update badges UI based on current streak / history
function updateBadges() {
  // 🌱 First success badge
  if (state.successCount >= 1) {
    badgeFirstEl.classList.add('unlocked');
  } else {
    badgeFirstEl.classList.remove('unlocked');
  }

  // 🔥 3 days streak badge
  if (state.streak >= 3) {
    badgeStreak3El.classList.add('unlocked');
  } else {
    badgeStreak3El.classList.remove('unlocked');
  }

  // 👑 7 days streak badge
  if (state.streak >= 7) {
    badgeStreak7El.classList.add('unlocked');
  } else {
    badgeStreak7El.classList.remove('unlocked');
  }

  // 💎 30 days streak badge
  if (state.streak >= 30) {
    badgeStreak30El.classList.add('unlocked');
  } else {
    badgeStreak30El.classList.remove('unlocked');
  }
}

// Render history records list in HTML
function renderHistory() {
  // Clear previous list
  const historyItems = historyListEl.querySelectorAll('.history-item');
  historyItems.forEach(item => item.remove());

  if (state.history.length === 0) {
    noHistoryMsgEl.style.display = 'block';
    return;
  }

  noHistoryMsgEl.style.display = 'none';

  // Render newest first
  const sortedHistory = [...state.history].sort((a, b) => b.id - a.id);
  
  sortedHistory.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'history-item';
    itemEl.innerHTML = `
      <span class="history-date">${item.date}</span>
      <div class="history-detail">
        <span class="history-amount">+${formatKRW(item.amount)}원</span>
        <button class="delete-history-btn" title="내역 삭제" data-id="${item.id}">✕</button>
      </div>
    `;
    historyListEl.appendChild(itemEl);
  });

  // Attach delete button click handlers
  const deleteBtns = historyListEl.querySelectorAll('.delete-history-btn');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.getAttribute('data-id'));
      deleteHistoryItem(id);
    });
  });
}

// Delete historical item
function deleteHistoryItem(id) {
  state.history = state.history.filter(item => item.id !== id);
  recalculateStats();
  saveState();
  updateUI();
  showToast("내역을 삭제했습니다.", "🗑️");
}

// Update whole UI states
function updateUI() {
  // Streak Card
  streakCountEl.textContent = state.streak;
  if (state.streak > 0) {
    streakEmojiEl.textContent = '🔥';
  } else {
    streakEmojiEl.textContent = '❄️';
  }

  // Savings dashboard
  totalSavedTextEl.innerHTML = `${formatKRW(state.totalSaved)}<span>원</span>`;
  todaySavedTextEl.textContent = `${formatKRW(state.todaySaved)}원`;
  todayCountEl.textContent = state.todayCount;

  // Goals progress
  const percent = state.savingGoal > 0 ? Math.min(Math.round((state.totalSaved / state.savingGoal) * 100), 100) : 0;
  progressPercentEl.textContent = `${percent}%`;
  progressFillEl.style.width = `${percent}%`;
  progressCurrentEl.textContent = `${formatKRW(state.totalSaved)}원`;
  progressGoalEl.textContent = `${formatKRW(state.savingGoal)}원`;
  goalTextBtnEl.textContent = `목표: ${formatKRW(state.savingGoal)}원`;
  goalInputEl.value = state.savingGoal;

  // Badges & History List
  updateBadges();
  renderHistory();
}

// Show Toast popup alerts
function showToast(message, emoji = '🎉') {
  const toast = document.getElementById('toast');
  const toastEmoji = document.getElementById('toastEmoji');
  const toastMessage = document.getElementById('toastMessage');
  
  toastEmoji.textContent = emoji;
  toastMessage.textContent = message;
  
  toast.classList.add('active');
  
  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }
  
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 2500);
}

// Confetti Particle Generator
function triggerConfetti(x, y) {
  const container = document.body;
  const colors = ['#22C55E', '#10B981', '#FF7A00', '#EF4444', '#3B82F6', '#F59E0B'];
  
  for (let i = 0; i < 35; i++) {
    const particle = document.createElement('div');
    particle.className = 'confetti-particle';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Randomly rectangle or circle
    if (Math.random() > 0.4) {
      particle.style.borderRadius = '50%';
    } else {
      particle.style.borderRadius = '2px';
    }
    
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    
    // Physics and rotation vectors
    const angle = (Math.random() * 360) * (Math.PI / 180);
    const distance = 40 + Math.random() * 110;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 20; // shoot upward/outward
    const tr = Math.random() * 720 - 360;
    
    particle.style.setProperty('--tx', `${tx}px`);
    particle.style.setProperty('--ty', `${ty}px`);
    particle.style.setProperty('--tr', `${tr}deg`);
    
    const size = 6 + Math.random() * 7;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    container.appendChild(particle);
    
    setTimeout(() => {
      particle.remove();
    }, 1500);
  }
}

// Floating score tag animation (+20,000)
function triggerFloatingText(text, x, y) {
  const floating = document.createElement('div');
  floating.className = 'floating-num';
  floating.textContent = text;
  floating.style.left = `${x}px`;
  floating.style.top = `${y}px`;
  document.body.appendChild(floating);
  
  setTimeout(() => {
    floating.remove();
  }, 1000);
}

// Load random alternative recommendation
let currentSuggestion = "";
function rollAlternativeAction() {
  const randomIndex = Math.floor(Math.random() * alternativeActions.length);
  const action = alternativeActions[randomIndex];
  currentSuggestion = action.text;
  
  altEmojiEl.textContent = action.emoji;
  altTextEl.textContent = action.text;
}

// Core button action: 배달 참기 성공!
function handleSuccessRefusal(e) {
  const todayStr = getTodayString();
  
  // Store previous streak to check for badge achievement
  const prevStreak = state.streak;
  
  // Append new success record
  const actionText = currentSuggestion || "배달 앱 유혹 견뎌내기";
  state.history.push({
    id: Date.now(),
    date: todayStr,
    amount: REFUSAL_AMOUNT,
    alternative: actionText
  });
  
  // Recalculate metrics and update Storage
  recalculateStats();
  saveState();
  
  // Update view
  updateUI();
  
  // Trigger visuals at button center or click coordinates
  let clickX, clickY;
  if (e && e.clientX && e.clientY) {
    clickX = e.clientX;
    clickY = e.clientY;
  } else {
    const rect = successBtnEl.getBoundingClientRect();
    clickX = rect.left + rect.width / 2;
    clickY = rect.top + rect.height / 2;
  }
  
  triggerConfetti(clickX, clickY);
  triggerFloatingText(`+${formatKRW(REFUSAL_AMOUNT)}원`, clickX, clickY);
  
  // Check for newly unlocked badges
  let toastMsg = `참기 성공! ${formatKRW(REFUSAL_AMOUNT)}원 절약`;
  let toastEmoji = '🍔';
  
  if (state.streak > prevStreak) {
    if (state.streak === 3) {
      toastMsg = "🔥 '작심 삼일' 배지 획득! 대단해요!";
      toastEmoji = "🏆";
    } else if (state.streak === 7) {
      toastMsg = "👑 '의지의 한국인' 배지 획득! 경이롭습니다!";
      toastEmoji = "🏆";
    } else if (state.streak === 30) {
      toastMsg = "💎 '배달의 단절' 배지 획득! 마스터의 탄생!";
      toastEmoji = "🏆";
    } else {
      toastMsg = `🔥 ${state.streak}일 연속 참아내기 성공!`;
      toastEmoji = "🔥";
    }
  } else if (state.successCount === 1) {
    toastMsg = "🌱 '첫 다이어트' 배지 획득! 좋은 시작입니다!";
    toastEmoji = "🏆";
  }
  
  showToast(toastMsg, toastEmoji);
  
  // Roll new recommended suggestion for the next challenge
  rollAlternativeAction();
}

// Switch Color Themes
function toggleTheme() {
  if (document.body.classList.contains('dark')) {
    document.body.classList.remove('dark');
    state.theme = 'light';
    themeToggleBtnEl.textContent = '🌙';
  } else {
    document.body.classList.add('dark');
    state.theme = 'dark';
    themeToggleBtnEl.textContent = '☀️';
  }
  saveState();
}

// Setup system theme initial check
function initTheme() {
  if (state.theme === 'dark') {
    document.body.classList.add('dark');
    themeToggleBtnEl.textContent = '☀️';
  } else if (state.theme === 'light') {
    document.body.classList.remove('dark');
    themeToggleBtnEl.textContent = '🌙';
  } else {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.body.classList.add('dark');
      themeToggleBtnEl.textContent = '☀️';
      state.theme = 'dark';
    } else {
      document.body.classList.remove('dark');
      themeToggleBtnEl.textContent = '🌙';
      state.theme = 'light';
    }
  }
}

// Event Listeners initialization
function setupEventListeners() {
  // Success trigger button
  successBtnEl.addEventListener('click', handleSuccessRefusal);
  
  // Recommendation refresh button
  refreshAltBtnEl.addEventListener('click', () => {
    rollAlternativeAction();
    showToast("새로운 행동이 추천되었습니다.", "💡");
  });
  
  // Goal Click triggers Edit Mode
  goalTextBtnEl.addEventListener('click', () => {
    goalTextBtnEl.style.display = 'none';
    goalInputWrapperEl.classList.add('active');
    goalInputEl.focus();
    goalInputEl.select();
  });
  
  // Save Goal Button
  saveGoalBtnEl.addEventListener('click', () => {
    const val = parseInt(goalInputEl.value);
    if (!isNaN(val) && val >= 1000) {
      state.savingGoal = val;
      saveState();
      updateUI();
      showToast(`목표 금액이 ${formatKRW(val)}원으로 설정되었습니다.`, "🎯");
    }
    goalInputWrapperEl.classList.remove('active');
    goalTextBtnEl.style.display = 'inline-block';
  });

  // Goal input key enter handling
  goalInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveGoalBtnEl.click();
    }
  });

  // Reset Everything
  resetDataBtnEl.addEventListener('click', () => {
    if (confirm("정말로 모든 데이터를 삭제하고 처음부터 시작하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) {
      localStorage.removeItem(STORAGE_KEY);
      state = {
        streak: 0,
        totalSaved: 0,
        todaySaved: 0,
        todayCount: 0,
        lastSuccessDate: null,
        successCount: 0,
        history: [],
        savingGoal: 200000,
        theme: 'light'
      };
      saveState();
      updateUI();
      rollAlternativeAction();
      showToast("데이터가 완전히 초기화되었습니다.", "🔄");
    }
  });

  // Color theme toggle
  themeToggleBtnEl.addEventListener('click', toggleTheme);
}

// App Initialization Entry point
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  initTheme();
  rollAlternativeAction();
  setupEventListeners();
  updateUI();
});
