/**
 * 輸入資料驗證工具模組
 */

const tzUtils = require('./timezone');

/**
 * 通用必填欄位驗證
 * @param {Object} data - 要驗證的數據對象
 * @param {Array<string>} requiredFields - 必填欄位列表
 * @returns {Object} - 驗證結果 {isValid, error}
 */
const validateRequired = (data, requiredFields) => {
  const missingFields = [];
  
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(field);
    }
  }
  
  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `缺少必填欄位: ${missingFields.join(', ')}`
    };
  }
  
  return { isValid: true };
};

/**
 * 驗證電子郵件格式
 * @param {string} email - 電子郵件地址
 * @returns {boolean} - 是否有效
 */
const isValidEmail = (email) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

/**
 * 驗證電話號碼格式
 * @param {string} phone - 電話號碼
 * @returns {boolean} - 是否有效
 */
const isValidPhone = (phone) => {
  // 允許 +86, +852, +853 開頭，後面跟數字
  // 或者原本的 8-15 位純數字
  const phonePattern = /^(?:\+(?:86|852|853))?\d{8,15}$/;
  return phonePattern.test(phone);
};

/**
 * 驗證性別格式
 * @param {string} gender - 性別
 * @returns {boolean} - 是否有效
 */
const isValidGender = (gender) => {
  return ['male', 'female', 'other'].includes(gender);
};

/**
 * 驗證預約請求數據
 * @param {Object} appointmentData - 預約數據
 * @returns {Object} - 驗證結果 {isValid, error}
 */
const validateAppointment = (appointmentData) => {
  // 檢查必填欄位
  const requiredFields = ['doctorId', 'patientId', 'appointmentDate', 'timeSlot'];
  const requiredCheck = validateRequired(appointmentData, requiredFields);
  if (!requiredCheck.isValid) {
    return requiredCheck;
  }
  
  // 驗證日期格式
  if (!tzUtils.isValidDate(appointmentData.appointmentDate)) {
    return {
      isValid: false,
      error: '預約日期格式不正確，應為 YYYY-MM-DD'
    };
  }
  
  // 驗證時間格式
  if (!tzUtils.isValidTime(appointmentData.timeSlot)) {
    return {
      isValid: false,
      error: '時間段格式不正確，應為 HH:MM'
    };
  }
  
  // 檢查是否為過去時間
  const timezone = appointmentData.timezone || tzUtils.DEFAULT_TIMEZONE;
  if (tzUtils.isPastDateTime(appointmentData.appointmentDate, appointmentData.timeSlot, timezone)) {
    return {
      isValid: false,
      error: '不能預約過去的時間'
    };
  }
  
  // 驗證病人信息 (如果是新病人)
  if (appointmentData.isNewPatient && appointmentData.patientInfo) {
    // 檢查必填欄位 - 暫時移除 phone 的必填要求
    // 2025-01-27: 修復 - phone 改為可選欄位，避免阻擋預約創建
    // const patientRequiredFields = ['phone'];
    // const patientCheck = validateRequired(appointmentData.patientInfo, patientRequiredFields);
    // if (!patientCheck.isValid) {
    //   return patientCheck;
    // }
    
    // 現在不強制要求任何欄位，但仍會驗證格式（如果有提供）
    
    // 驗證電話號碼
    if (appointmentData.patientInfo.phone && !isValidPhone(appointmentData.patientInfo.phone)) {
      return {
        isValid: false,
        error: '電話號碼格式不正確，可選區號 (+86, +852, +853) 後接8-15位數字'
      };
    }
    
    // 驗證電子郵件 (如果提供)
    if (appointmentData.patientInfo.email && !isValidEmail(appointmentData.patientInfo.email)) {
      return {
        isValid: false,
        error: '電子郵件格式不正確'
      };
    }
    
    // 驗證生日 (如果提供)
    if (appointmentData.patientInfo.birthDate) {
      if (!tzUtils.isValidDate(appointmentData.patientInfo.birthDate)) {
        return {
          isValid: false,
          error: '生日格式不正確，應為 YYYY-MM-DD'
        };
      }
      
      // 檢查生日是否為未來日期
      const birthDate = new Date(appointmentData.patientInfo.birthDate);
      const now = new Date();
      if (birthDate > now) {
        return {
          isValid: false,
          error: '生日不能是未來日期'
        };
      }
    }
    
    // 驗證性別 (如果提供)
    if (appointmentData.patientInfo.gender && !isValidGender(appointmentData.patientInfo.gender)) {
      return {
        isValid: false,
        error: '性別格式不正確，應為 male、female 或 other'
      };
    }
  }
  
  // 所有驗證通過
  return { isValid: true };
};

/**
 * 驗證用戶資料
 * @param {Object} userData - 用戶數據
 * @returns {Object} - 驗證結果 {isValid, error}
 */
const validateUser = (userData) => {
  // 檢查必填欄位 - 簡化註冊：只有 email 和 password 是必填的
  const requiredFields = ['email', 'password'];
  const requiredCheck = validateRequired(userData, requiredFields);
  if (!requiredCheck.isValid) {
    return requiredCheck;
  }
  
  // 驗證電子郵件格式
  if (!isValidEmail(userData.email)) {
    return {
      isValid: false,
      error: '電子郵件格式不正確'
    };
  }
  
  // 驗證密碼長度
  if (userData.password.length < 6) {
    return {
      isValid: false,
      error: '密碼長度必須至少為 6 個字符'
    };
  }
  
  // 驗證電話號碼 (如果提供)
  if (userData.phone && !isValidPhone(userData.phone)) {
    return {
      isValid: false,
      error: '電話號碼格式不正確，可選區號 (+86, +852, +853) 後接8-15位數字'
    };
  }
  
  // 驗證角色 (如果提供)
  if (userData.role && !['admin', 'doctor', 'patient'].includes(userData.role)) {
    return {
      isValid: false,
      error: '無效的用戶角色'
    };
  }
  
  // 所有驗證通過
  return { isValid: true };
};

module.exports = {
  validateRequired,
  isValidEmail,
  isValidPhone,
  isValidGender,
  validateAppointment,
  validateUser
}; 