#!/usr/bin/env node

/**
 * 心理治療預約系統 - 快速診斷腳本
 * 快速檢查所有核心系統功能是否正常運作
 */

const https = require('https');
const http = require('http');

// 配置
const API_BASE = 'https://psy-backend.zeabur.app';
const TEST_CREDENTIALS = {
  admin: { email: 'admin@example.com', password: '[REDACTED]' },
  doctor: { email: 'doctor@example.com', password: '[REDACTED]' },
  patient: { email: 'patient@example.com', password: '[REDACTED]' }
};

let authToken = null;
let currentUser = null;

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  let color = colors.reset;
  let prefix = 'ℹ️';
  
  switch (type) {
    case 'success':
      color = colors.green;
      prefix = '✅';
      break;
    case 'error':
      color = colors.red;
      prefix = '❌';
      break;
    case 'warning':
      color = colors.yellow;
      prefix = '⚠️';
      break;
    case 'info':
      color = colors.blue;
      prefix = 'ℹ️';
      break;
  }
  
  console.log(`${color}[${timestamp}] ${prefix} ${message}${colors.reset}`);
}

// API 請求函數
function makeRequest(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${endpoint}`;
    const urlObj = new URL(url);
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'psy-backend-diagnosis/1.0.0'
      }
    };
    
    if (authToken) {
      defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const requestOptions = { ...defaultOptions, ...options };
    if (options.body && typeof options.body === 'object') {
      requestOptions.body = JSON.stringify(options.body);
    }
    
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: requestOptions.method,
      headers: requestOptions.headers
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: { message: data }
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (requestOptions.body) {
      req.write(requestOptions.body);
    }
    
    req.end();
  });
}

// 測試函數
async function testHealth() {
  log('檢查系統健康狀態...', 'info');
  try {
    const result = await makeRequest('/api/health');
    if (result.success) {
      log(`系統健康：${result.data.message}`, 'success');
      return true;
    } else {
      log(`系統健康檢查失敗：${result.status}`, 'error');
      return false;
    }
  } catch (error) {
    log(`健康檢查錯誤：${error.message}`, 'error');
    return false;
  }
}

async function testLogin(role = 'admin') {
  log(`測試 ${role} 登入...`, 'info');
  try {
    const credentials = TEST_CREDENTIALS[role];
    const result = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: credentials
    });
    
    if (result.success && result.data.user) {
      currentUser = result.data.user;
      authToken = result.data.token;
      log(`${role} 登入成功：${currentUser.name} (${currentUser.email})`, 'success');
      return true;
    } else {
      log(`${role} 登入失敗：${JSON.stringify(result.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`${role} 登入錯誤：${error.message}`, 'error');
    return false;
  }
}

async function testGetUsers() {
  log('測試獲取用戶列表...', 'info');
  try {
    const result = await makeRequest('/api/users');
    if (result.success) {
      const userCount = result.data.users ? result.data.users.length : 0;
      log(`用戶列表獲取成功，共 ${userCount} 個用戶`, 'success');
      return true;
    } else {
      log(`獲取用戶列表失敗：${JSON.stringify(result.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`獲取用戶列表錯誤：${error.message}`, 'error');
    return false;
  }
}

async function testGetDoctors() {
  log('測試獲取醫生列表...', 'info');
  try {
    const result = await makeRequest('/api/users/doctors');
    if (result.success) {
      const doctorCount = result.data.doctors ? result.data.doctors.length : 0;
      log(`醫生列表獲取成功，共 ${doctorCount} 個醫生`, 'success');
      return result.data.doctors || [];
    } else {
      log(`獲取醫生列表失敗：${JSON.stringify(result.data)}`, 'error');
      return [];
    }
  } catch (error) {
    log(`獲取醫生列表錯誤：${error.message}`, 'error');
    return [];
  }
}

async function testCreateAppointment(doctors) {
  log('測試創建預約...', 'info');
  
  if (!doctors.length) {
    log('沒有可用的醫生，跳過預約測試', 'warning');
    return false;
  }
  
  if (!currentUser) {
    log('需要先登入，跳過預約測試', 'warning');
    return false;
  }
  
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const appointmentData = {
      doctorId: doctors[0].id,
      patientId: currentUser.id,
      appointmentDate: tomorrowStr,
      timeSlot: '10:00',
      reason: '診斷測試預約'
    };
    
    const result = await makeRequest('/api/appointments', {
      method: 'POST',
      body: appointmentData
    });
    
    if (result.success) {
      log(`預約創建成功：ID ${result.data.appointment ? result.data.appointment.id : 'unknown'}`, 'success');
      return result.data.appointment;
    } else {
      log(`創建預約失敗：${JSON.stringify(result.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`創建預約錯誤：${error.message}`, 'error');
    return false;
  }
}

async function testGetAppointments() {
  log('測試獲取預約列表...', 'info');
  try {
    const result = await makeRequest('/api/appointments');
    if (result.success) {
      const appointmentCount = result.data.appointments ? result.data.appointments.length : 0;
      log(`預約列表獲取成功，共 ${appointmentCount} 個預約`, 'success');
      return true;
    } else {
      log(`獲取預約列表失敗：${JSON.stringify(result.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`獲取預約列表錯誤：${error.message}`, 'error');
    return false;
  }
}

async function testUpdateAppointment(appointment) {
  if (!appointment || !appointment.id) {
    log('沒有有效的預約可更新，跳過測試', 'warning');
    return false;
  }
  
  log(`測試更新預約狀態 (ID: ${appointment.id})...`, 'info');
  try {
    const result = await makeRequest(`/api/appointments/${appointment.id}/status`, {
      method: 'PUT',
      body: {
        status: 'completed',
        note: '診斷測試已完成'
      }
    });
    
    if (result.success) {
      log(`預約狀態更新成功`, 'success');
      return true;
    } else {
      log(`更新預約狀態失敗：${JSON.stringify(result.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`更新預約狀態錯誤：${error.message}`, 'error');
    return false;
  }
}

async function testForgotPassword() {
  log('測試忘記密碼功能...', 'info');
  try {
    const result = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'admin@example.com' }
    });
    
    if (result.success) {
      log('忘記密碼請求發送成功', 'success');
      return true;
    } else {
      log(`忘記密碼請求失敗：${JSON.stringify(result.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`忘記密碼測試錯誤：${error.message}`, 'error');
    return false;
  }
}

async function testSchedule(doctors) {
  if (!doctors.length) {
    log('沒有可用的醫生，跳過排程測試', 'warning');
    return false;
  }
  
  log('測試獲取醫生排程...', 'info');
  try {
    const doctorId = doctors[0].id;
    const result = await makeRequest(`/api/schedules/doctor/${doctorId}`);
    
    if (result.success) {
      log('醫生排程獲取成功', 'success');
      return true;
    } else {
      log(`獲取醫生排程失敗：${JSON.stringify(result.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`獲取醫生排程錯誤：${error.message}`, 'error');
    return false;
  }
}

// 主診斷函數
async function runDiagnosis() {
  console.log(`${colors.cyan}
╔══════════════════════════════════════════════════════════╗
║                🏥 心理治療預約系統診斷                     ║
║                  快速功能檢查工具                          ║
╚══════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  const results = {
    health: false,
    login: false,
    users: false,
    doctors: false,
    appointment: false,
    appointmentList: false,
    appointmentUpdate: false,
    forgotPassword: false,
    schedule: false
  };
  
  let doctors = [];
  let createdAppointment = null;
  
  // 1. 系統健康檢查
  results.health = await testHealth();
  
  if (!results.health) {
    log('系統健康檢查失敗，停止診斷', 'error');
    return results;
  }
  
  // 2. 身份驗證測試
  results.login = await testLogin('admin');
  
  if (!results.login) {
    log('登入失敗，停止需要認證的測試', 'error');
  } else {
    // 3. 用戶管理測試
    results.users = await testGetUsers();
    
    // 4. 醫生列表測試
    doctors = await testGetDoctors();
    results.doctors = doctors.length > 0;
    
    // 5. 預約管理測試
    createdAppointment = await testCreateAppointment(doctors);
    results.appointment = !!createdAppointment;
    
    // 6. 預約列表測試
    results.appointmentList = await testGetAppointments();
    
    // 7. 預約更新測試
    results.appointmentUpdate = await testUpdateAppointment(createdAppointment);
    
    // 8. 排程測試
    results.schedule = await testSchedule(doctors);
  }
  
  // 9. 忘記密碼測試（不需要認證）
  results.forgotPassword = await testForgotPassword();
  
  // 輸出診斷報告
  console.log(`\n${colors.cyan}╔══════════════════════════════════════════════════════════╗`);
  console.log(`║                      診斷報告                             ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  const tests = [
    { name: '系統健康檢查', key: 'health' },
    { name: '管理員登入', key: 'login' },
    { name: '用戶管理', key: 'users' },
    { name: '醫生列表', key: 'doctors' },
    { name: '創建預約', key: 'appointment' },
    { name: '預約列表', key: 'appointmentList' },
    { name: '更新預約', key: 'appointmentUpdate' },
    { name: '忘記密碼', key: 'forgotPassword' },
    { name: '醫生排程', key: 'schedule' }
  ];
  
  const passedTests = [];
  const failedTests = [];
  
  tests.forEach(test => {
    const status = results[test.key];
    const icon = status ? '✅' : '❌';
    const color = status ? colors.green : colors.red;
    
    console.log(`${color}${icon} ${test.name}${colors.reset}`);
    
    if (status) {
      passedTests.push(test.name);
    } else {
      failedTests.push(test.name);
    }
  });
  
  const totalTests = tests.length;
  const passed = passedTests.length;
  const failed = failedTests.length;
  const successRate = Math.round((passed / totalTests) * 100);
  
  console.log(`\n${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`總測試數: ${totalTests}`);
  console.log(`${colors.green}通過: ${passed}${colors.reset}`);
  console.log(`${colors.red}失敗: ${failed}${colors.reset}`);
  console.log(`成功率: ${successRate >= 80 ? colors.green : colors.red}${successRate}%${colors.reset}`);
  
  if (successRate >= 80) {
    console.log(`\n${colors.green}🎉 系統運行良好！大部分功能正常運作。${colors.reset}`);
  } else if (successRate >= 60) {
    console.log(`\n${colors.yellow}⚠️ 系統有部分問題，需要檢查失敗的功能。${colors.reset}`);
  } else {
    console.log(`\n${colors.red}🚨 系統存在嚴重問題，需要立即修復！${colors.reset}`);
  }
  
  if (failedTests.length > 0) {
    console.log(`\n${colors.red}失敗的測試：${colors.reset}`);
    failedTests.forEach(test => {
      console.log(`  • ${test}`);
    });
  }
  
  console.log(`\n${colors.cyan}診斷完成。詳細日誌請查看上方輸出。${colors.reset}\n`);
  
  return results;
}

// 執行診斷
if (require.main === module) {
  runDiagnosis().catch(error => {
    log(`診斷過程中發生錯誤：${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = { runDiagnosis, log, makeRequest }; 