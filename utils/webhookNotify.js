const axios = require('axios');

const OPENCLAW_WEBHOOK_URL = 'https://samuclaw.zeabur.app/hooks/agent';
const OPENCLAW_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN;
const NOTIFY_WHATSAPP_NUMBER = process.env.OPENCLAW_NOTIFY_WHATSAPP;

async function notifyAppointmentEvent(eventType, appointmentData) {
  if (!OPENCLAW_TOKEN) {
    console.warn('[Webhook] OPENCLAW_HOOKS_TOKEN 未設定，跳過通知');
    return;
  }

  const { patientName, date, time, isNewPatient, notes } = appointmentData;

  let message;
  if (eventType === 'created') {
    message = `📅 新預約通知：\n就診者：${patientName}\n日期：${date}\n時間：${time}\n是否初診：${isNewPatient ? '是' : '否'}${notes ? '\n備註：' + notes : ''}\n\n請幫我整理到今天的行程摘要中。`;
  } else if (eventType === 'cancelled') {
    message = `❌ 預約取消通知：\n就診者：${patientName}\n原日期：${date}\n原時間：${time}\n\n請幫我更新今天的行程摘要。`;
  } else {
    return;
  }

  try {
    await axios.post(
      OPENCLAW_WEBHOOK_URL,
      {
        message,
        name: '預約系統',
        deliver: true,
        channel: 'whatsapp',
        to: NOTIFY_WHATSAPP_NUMBER,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + OPENCLAW_TOKEN,
        },
        timeout: 10000,
      }
    );
    console.log('[Webhook] ' + eventType + ' 通知已發送');
  } catch (err) {
    console.error('[Webhook] 發送 ' + eventType + ' 通知失敗:', err.message);
  }
}

module.exports = { notifyAppointmentEvent };
