/**
 * 電子郵件通知服務模組
 */

const nodemailer = require('nodemailer');

// 設置郵件發送配置
const createTransporter = () => {
  // 使用環境變數或預設配置
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = process.env.EMAIL_PORT || 587;
  const secure = process.env.EMAIL_SECURE === 'true' || false;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // 如果未配置郵件服務，記錄警告並返回null
  if (!user || !pass) {
    console.warn('[郵件服務] 警告: 未設置郵件憑證，將不會發送實際郵件。請設置 EMAIL_USER 和 EMAIL_PASS 環境變數。');
    return null;
  }

  // 創建發送器
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
};

// 初始化一個全局發送器
let transporter = createTransporter();

/**
 * 發送預約確認通知給醫生
 * @param {Object} doctorInfo - 醫生資訊
 * @param {Object} patientInfo - 患者資訊
 * @param {Object} appointmentInfo - 預約資訊
 * @returns {Promise<boolean>} 發送結果
 */
const sendAppointmentNotificationToDoctor = async (doctorInfo, patientInfo, appointmentInfo) => {
  try {
    // 如果未配置郵件服務，只記錄訊息
    if (!transporter) {
      console.log(`[郵件服務] 模擬發送預約通知郵件給醫生 ${doctorInfo.email || doctorInfo.username}`);
      console.log(`[郵件服務] 內容: 新預約 - 患者: ${patientInfo.name}, 日期: ${appointmentInfo.date}, 時間: ${appointmentInfo.time}`);
      return true;
    }

    // 構建郵件內容
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"心理治療預約系統" <noreply@therapy-system.com>',
      to: doctorInfo.email || doctorInfo.username,
      subject: '【新預約通知】您有新的治療預約',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4a6ee0;">您有新的預約安排</h2>
          <p>親愛的 ${doctorInfo.name} 醫生：</p>
          <p>系統已為您安排了一個新的預約。詳情如下：</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>患者姓名：</strong> ${patientInfo.name}</p>
            <p><strong>預約日期：</strong> ${appointmentInfo.date}</p>
            <p><strong>預約時間：</strong> ${appointmentInfo.time}</p>
            ${appointmentInfo.notes ? `<p><strong>備註：</strong> ${appointmentInfo.notes}</p>` : ''}
          </div>
          <p>您可以登入系統查看更多詳情並管理此預約。</p>
          <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
            此郵件由系統自動發送，請勿直接回覆。
          </p>
        </div>
      `
    };

    // 發送郵件
    const info = await transporter.sendMail(mailOptions);
    console.log(`[郵件服務] 成功發送預約通知給醫生 ${doctorInfo.email || doctorInfo.username}, 郵件ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[郵件服務] 發送預約通知給醫生時出錯:`, error);
    return false;
  }
};

/**
 * 發送預約確認通知給患者
 * @param {Object} patientInfo - 患者資訊
 * @param {Object} doctorInfo - 醫生資訊
 * @param {Object} appointmentInfo - 預約資訊
 * @returns {Promise<boolean>} 發送結果
 */
const sendAppointmentConfirmationToPatient = async (patientInfo, doctorInfo, appointmentInfo) => {
  try {
    // 如果未配置郵件服務，只記錄訊息
    if (!transporter) {
      console.log(`[郵件服務] 模擬發送預約確認郵件給患者 ${patientInfo.email || patientInfo.username}`);
      console.log(`[郵件服務] 內容: 預約確認 - 醫生: ${doctorInfo.name}, 日期: ${appointmentInfo.date}, 時間: ${appointmentInfo.time}`);
      return true;
    }

    // 構建郵件內容
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"心理治療預約系統" <noreply@therapy-system.com>',
      to: patientInfo.email || patientInfo.username,
      subject: '【預約確認】您的心理治療預約已確認',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4a6ee0;">您的預約已確認</h2>
          <p>親愛的 ${patientInfo.name}：</p>
          <p>您的心理治療預約已確認。詳情如下：</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>治療師：</strong> ${doctorInfo.name} 醫生</p>
            <p><strong>預約日期：</strong> ${appointmentInfo.date}</p>
            <p><strong>預約時間：</strong> ${appointmentInfo.time}</p>
            ${appointmentInfo.notes ? `<p><strong>備註：</strong> ${appointmentInfo.notes}</p>` : ''}
          </div>
          <p>如需變更或取消預約，請提前24小時通知我們。</p>
          <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
            此郵件由系統自動發送，請勿直接回覆。如有疑問，請直接聯繫診所。
          </p>
        </div>
      `
    };

    // 發送郵件
    const info = await transporter.sendMail(mailOptions);
    console.log(`[郵件服務] 成功發送預約確認給患者 ${patientInfo.email || patientInfo.username}, 郵件ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[郵件服務] 發送預約確認給患者時出錯:`, error);
    return false;
  }
};

/**
 * 發送預約狀態變更通知
 * @param {Object} userInfo - 接收通知的用戶資訊
 * @param {Object} appointmentInfo - 預約資訊
 * @param {string} newStatus - 新狀態
 * @param {string} userType - 用戶類型 ('doctor' 或 'patient')
 * @returns {Promise<boolean>} 發送結果
 */
const sendAppointmentStatusChangeNotification = async (userInfo, appointmentInfo, newStatus, userType) => {
  try {
    // 如果未配置郵件服務，只記錄訊息
    if (!transporter) {
      console.log(`[郵件服務] 模擬發送狀態變更通知給 ${userType} ${userInfo.email || userInfo.username}`);
      console.log(`[郵件服務] 內容: 預約狀態變更為 ${newStatus}, 日期: ${appointmentInfo.date}, 時間: ${appointmentInfo.time}`);
      return true;
    }

    // 根據不同狀態設置郵件主題和內容
    let subject, statusText, additionalText = '';
    switch (newStatus) {
      case 'confirmed':
        subject = '【預約已確認】您的心理治療預約已確認';
        statusText = '已確認';
        break;
      case 'cancelled':
        subject = '【預約已取消】您的心理治療預約已取消';
        statusText = '已取消';
        additionalText = '<p>如需重新安排預約，請登入系統或聯繫診所。</p>';
        break;
      case 'completed':
        subject = '【預約已完成】您的心理治療預約已完成';
        statusText = '已完成';
        break;
      default:
        subject = `【預約狀態更新】您的心理治療預約狀態已更新為 ${newStatus}`;
        statusText = newStatus;
    }

    // 構建郵件內容
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"心理治療預約系統" <noreply@therapy-system.com>',
      to: userInfo.email || userInfo.username,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
          <h2 style="color: #4a6ee0;">預約狀態已更新</h2>
          <p>親愛的 ${userInfo.name}：</p>
          <p>您的心理治療預約狀態已更新為 <strong>${statusText}</strong>。詳情如下：</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>預約日期：</strong> ${appointmentInfo.date}</p>
            <p><strong>預約時間：</strong> ${appointmentInfo.time}</p>
            ${appointmentInfo.notes ? `<p><strong>備註：</strong> ${appointmentInfo.notes}</p>` : ''}
          </div>
          ${additionalText}
          <p>您可以登入系統查看更多詳情。</p>
          <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
            此郵件由系統自動發送，請勿直接回覆。如有疑問，請直接聯繫診所。
          </p>
        </div>
      `
    };

    // 發送郵件
    const info = await transporter.sendMail(mailOptions);
    console.log(`[郵件服務] 成功發送狀態變更通知給 ${userType} ${userInfo.email || userInfo.username}, 郵件ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[郵件服務] 發送狀態變更通知時出錯:`, error);
    return false;
  }
};

/**
 * 重新載入郵件發送器配置
 * 當環境變數變更時可以調用
 */
const reloadTransporter = () => {
  transporter = createTransporter();
  return !!transporter;
};

module.exports = {
  sendAppointmentNotificationToDoctor,
  sendAppointmentConfirmationToPatient,
  sendAppointmentStatusChangeNotification,
  reloadTransporter
}; 