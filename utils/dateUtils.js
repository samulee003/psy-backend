/**
 * 日期和時間工具函數
 */

/**
 * 獲取當前時間的 UTC 時間字符串 (ISO 格式)
 * @returns {string} - 格式為 "YYYY-MM-DDTHH:MM:SS.mmmZ" 的 UTC 時間
 */
const getCurrentUTCTime = () => {
  return new Date().toISOString();
};

/**
 * 獲取當前日期的字符串 (UTC)
 * @returns {string} - 格式為 "YYYY-MM-DD" 的當前日期
 */
const getCurrentUTCDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * 檢查一個日期時間是否為過去時間
 * @param {string} dateStr - 日期字符串，格式為 "YYYY-MM-DD"
 * @param {string} timeStr - 時間字符串，格式為 "HH:MM"
 * @returns {boolean} - 如果是過去時間則返回 true，否則返回 false
 */
const isPastDateTime = (dateStr, timeStr) => {
  // 創建日期時間對象
  const dateTime = new Date(`${dateStr}T${timeStr}:00`);
  // 獲取當前時間
  const now = new Date();
  // 比較日期時間
  return dateTime < now;
};

/**
 * 檢查一個日期是否為過去日期
 * @param {string} dateStr - 日期字符串，格式為 "YYYY-MM-DD"
 * @returns {boolean} - 如果是過去日期則返回 true，否則返回 false
 */
const isPastDate = (dateStr) => {
  // 創建日期對象並設置時間為 00:00:00
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  // 獲取當前日期並設置時間為 00:00:00
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // 比較日期
  return date < today;
};

/**
 * 驗證日期格式是否為 YYYY-MM-DD
 * @param {string} dateStr - 要驗證的日期字符串
 * @returns {boolean} - 如果格式正確則返回 true，否則返回 false
 */
const isValidDateFormat = (dateStr) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

/**
 * 驗證時間格式是否為 HH:MM (24小時制)
 * @param {string} timeStr - 要驗證的時間字符串
 * @returns {boolean} - 如果格式正確則返回 true，否則返回 false
 */
const isValidTimeFormat = (timeStr) => {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr);
};

/**
 * 驗證時間段格式是否為 HH:MM，且分鐘只能是 00 或 30 (用於 30 分鐘時段的預約系統)
 * @param {string} timeStr - 要驗證的時間字符串
 * @returns {boolean} - 如果格式正確則返回 true，否則返回 false
 */
const isValidTimeSlotFormat = (timeStr) => {
  return /^([01]?[0-9]|2[0-3]):(00|30)$/.test(timeStr);
};

/**
 * 將時間字符串轉換為分鐘數（從當天00:00起算）
 * @param {string} timeStr - 時間字符串，格式為 "HH:MM"
 * @returns {number} - 分鐘數
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * 將分鐘數轉換為時間字符串（例如：480 -> "08:00"）
 * @param {number} minutes - 分鐘數
 * @returns {string} - 時間字符串，格式為 "HH:MM"
 */
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * 生成時間段列表，從開始時間到結束時間，按照指定的時段間隔
 * @param {string} startTime - 開始時間，格式為 "HH:MM"
 * @param {string} endTime - 結束時間，格式為 "HH:MM"
 * @param {number} slotDuration - 時段持續時間，單位為分鐘
 * @returns {string[]} - 時間段列表，格式為 ["HH:MM", "HH:MM", ...]
 */
const generateTimeSlots = (startTime, endTime, slotDuration) => {
  const slots = [];
  
  // 將時間字符串轉換為分鐘數
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  // 生成時間段
  for (let i = startMinutes; i < endMinutes; i += slotDuration) {
    slots.push(minutesToTime(i));
  }
  
  return slots;
};

/**
 * 過濾掉過去的時間段
 * @param {string[]} timeSlots - 時間段列表，格式為 ["HH:MM", "HH:MM", ...]
 * @param {string} dateStr - 日期字符串，格式為 "YYYY-MM-DD"
 * @returns {string[]} - 過濾後的時間段列表
 */
const filterPastTimeSlots = (timeSlots, dateStr) => {
  // 如果日期是過去日期，則返回空數組
  if (isPastDate(dateStr)) {
    return [];
  }
  
  // 檢查日期是否為今天
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // 如果不是今天，則返回原始時間段列表
  if (dateStr !== todayStr) {
    return timeSlots;
  }
  
  // 如果是今天，過濾掉過去的時間段
  const currentHour = today.getHours();
  const currentMinute = today.getMinutes();
  
  return timeSlots.filter(slot => {
    const [slotHour, slotMinute] = slot.split(':').map(Number);
    
    // 如果時間已經過去，則過濾掉
    if (slotHour < currentHour || (slotHour === currentHour && slotMinute <= currentMinute)) {
      return false;
    }
    return true;
  });
};

module.exports = {
  getCurrentUTCTime,
  getCurrentUTCDate,
  isPastDateTime,
  isPastDate,
  isValidDateFormat,
  isValidTimeFormat,
  isValidTimeSlotFormat,
  timeToMinutes,
  minutesToTime,
  generateTimeSlots,
  filterPastTimeSlots
}; 