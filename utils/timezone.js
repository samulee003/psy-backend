/**
 * 時區處理工具模組
 */

const moment = require('moment-timezone');

// 設置系統默認時區，通常是診所/醫院所在的時區
const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Taipei';

/**
 * 將本地日期時間轉換為 UTC 格式存儲
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @param {string} time - 時間 (HH:mm)
 * @param {string} timezone - 時區 (默認為系統設定時區)
 * @returns {string} - UTC 格式的日期時間
 */
const localToUTC = (date, time, timezone = DEFAULT_TIMEZONE) => {
  const localDateTime = `${date} ${time}`;
  return moment.tz(localDateTime, 'YYYY-MM-DD HH:mm', timezone).utc().format();
};

/**
 * 將 UTC 日期時間轉換為本地格式
 * @param {string} utcDateTime - UTC 格式的日期時間
 * @param {string} timezone - 目標時區 (默認為系統設定時區)
 * @returns {Object} - 包含日期和時間的對象
 */
const utcToLocal = (utcDateTime, timezone = DEFAULT_TIMEZONE) => {
  const localMoment = moment.utc(utcDateTime).tz(timezone);
  return {
    date: localMoment.format('YYYY-MM-DD'),
    time: localMoment.format('HH:mm'),
    formattedDateTime: localMoment.format('YYYY-MM-DD HH:mm (z)')
  };
};

/**
 * 檢查日期時間是否已過期 (早於當前時間)
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @param {string} time - 時間 (HH:mm)
 * @param {string} timezone - 時區 (默認為系統設定時區)
 * @returns {boolean} - 如果日期時間已過期則返回 true
 */
const isPastDateTime = (date, time, timezone = DEFAULT_TIMEZONE) => {
  const localDateTime = `${date} ${time}`;
  const dateTimeToCheck = moment.tz(localDateTime, 'YYYY-MM-DD HH:mm', timezone);
  const now = moment.tz(timezone);
  return dateTimeToCheck.isBefore(now);
};

/**
 * 生成 ISO 格式的時間範圍字符串
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @param {Array<string>} timeSlots - 時間段數組 (格式: ["HH:mm", "HH:mm", ...])
 * @param {string} timezone - 時區 (默認為系統設定時區)
 * @returns {Array<string>} - ISO 格式的時間範圍數組
 */
const generateISOTimeSlots = (date, timeSlots, timezone = DEFAULT_TIMEZONE) => {
  return timeSlots.map(time => {
    return moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', timezone).utc().format();
  });
};

/**
 * 獲取當前時間的 ISO 字符串
 * @param {string} timezone - 時區 (默認為系統設定時區)
 * @returns {string} - 當前時間的 ISO 字符串
 */
const getCurrentISOTime = (timezone = DEFAULT_TIMEZONE) => {
  return moment.tz(timezone).utc().format();
};

/**
 * 驗證日期格式是否正確
 * @param {string} date - 日期字符串 (應為 YYYY-MM-DD 格式)
 * @returns {boolean} - 日期格式是否有效
 */
const isValidDate = (date) => {
  return moment(date, 'YYYY-MM-DD', true).isValid();
};

/**
 * 驗證時間格式是否正確
 * @param {string} time - 時間字符串 (應為 HH:mm 格式)
 * @returns {boolean} - 時間格式是否有效
 */
const isValidTime = (time) => {
  return moment(time, 'HH:mm', true).isValid();
};

module.exports = {
  DEFAULT_TIMEZONE,
  localToUTC,
  utcToLocal,
  isPastDateTime,
  generateISOTimeSlots,
  getCurrentISOTime,
  isValidDate,
  isValidTime
}; 