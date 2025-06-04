/**
 * 用戶管理控制器
 */

const bcrypt = require('bcrypt');

// 獲取所有用戶
const getAllUsers = (db) => (req, res) => {
  const query = `
    SELECT id, name, email, role, created_at, updated_at
    FROM users
    ORDER BY id DESC
  `;

  db.all(query, [], (err, users) => {
    if (err) {
      console.error('獲取用戶列表錯誤:', err.message);
      return res.status(500).json({ error: '無法獲取用戶列表' });
    }
    res.json({ users });
  });
};

// 獲取單個用戶信息
const getUserById = (db) => (req, res) => {
  const { userId } = req.params;

  const query = `
    SELECT id, name, email, role, created_at, updated_at
    FROM users
    WHERE id = ?
  `;

  db.get(query, [userId], (err, user) => {
    if (err) {
      console.error('獲取用戶信息錯誤:', err.message);
      return res.status(500).json({ error: '無法獲取用戶信息' });
    }

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    res.json({ user });
  });
};

// 更新用戶信息
const updateUser = (db) => async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, password, role } = req.body;

    // 檢查用戶是否存在
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        console.error('查詢用戶錯誤:', err.message);
        return res.status(500).json({ error: '伺服器錯誤' });
      }

      if (!user) {
        return res.status(404).json({ error: '用戶不存在' });
      }

      // 檢查是否有其他用戶使用相同的電子郵件
      if (email && email !== user.email) {
        db.get('SELECT * FROM users WHERE email = ? AND id != ?', [email, userId], (err, existingUser) => {
          if (err) {
            console.error('檢查電子郵件錯誤:', err.message);
            return res.status(500).json({ error: '伺服器錯誤' });
          }

          if (existingUser) {
            return res.status(400).json({ error: '此電子郵件已被使用' });
          }
        });
      }

      // 準備更新數據和參數
      let updateFields = [];
      let updateParams = [];

      if (name) {
        updateFields.push('name = ?');
        updateParams.push(name);
      }

      if (email) {
        updateFields.push('email = ?');
        updateParams.push(email);
      }

      if (role) {
        updateFields.push('role = ?');
        updateParams.push(role);
      }

      // 密碼需要特殊處理
      if (password) {
        try {
          const saltRounds = 10;
          const hashedPassword = await bcrypt.hash(password, saltRounds);
          updateFields.push('password = ?');
          updateParams.push(hashedPassword);
        } catch (error) {
          console.error('密碼加密錯誤:', error.message);
          return res.status(500).json({ error: '更新密碼時發生錯誤' });
        }
      }

      // 添加更新時間
      updateFields.push('updated_at = datetime("now")');

      // 添加用戶ID到參數數組
      updateParams.push(userId);

      // 如果沒有要更新的字段，返回錯誤
      if (updateFields.length === 0) {
        return res.status(400).json({ error: '沒有提供要更新的數據' });
      }

      // 構建更新查詢
      const updateQuery = `
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      // 執行更新
      db.run(updateQuery, updateParams, function(err) {
        if (err) {
          console.error('更新用戶錯誤:', err.message);
          return res.status(500).json({ error: '無法更新用戶信息' });
        }

        // 獲取更新後的用戶信息
        db.get('SELECT id, name, email, role, created_at, updated_at FROM users WHERE id = ?', [userId], (err, updatedUser) => {
          if (err) {
            console.error('獲取更新後用戶信息錯誤:', err.message);
            return res.status(500).json({ error: '用戶信息已更新，但無法獲取更新後的數據' });
          }

          res.json({
            message: '用戶信息更新成功',
            user: updatedUser
          });
        });
      });
    });
  } catch (error) {
    console.error('更新用戶過程中發生錯誤:', error.message);
    res.status(500).json({ error: '更新用戶失敗，請稍後再試' });
  }
};

// 刪除用戶
const deleteUser = (db) => (req, res) => {
  const { userId } = req.params;

  // 檢查用戶是否存在
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('查詢用戶錯誤:', err.message);
      return res.status(500).json({ error: '伺服器錯誤' });
    }

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 防止刪除最後一個管理員帳戶
    if (user.role === 'admin') {
      db.get('SELECT COUNT(*) as count FROM users WHERE role = "admin"', [], (err, result) => {
        if (err) {
          console.error('查詢管理員數量錯誤:', err.message);
          return res.status(500).json({ error: '伺服器錯誤' });
        }

        if (result.count <= 1) {
          return res.status(409).json({ 
            error: '無法刪除最後一個管理員帳戶',
            canProceed: false,
            reason: 'last_admin'
          });
        } else {
          // 有多個管理員，可以繼續檢查其他關聯
          checkRelatedData(user);
        }
      });
    } else {
      // 非管理員帳戶，直接檢查關聯
      checkRelatedData(user);
    }
  });

  function checkRelatedData(user) {
    // 根據用戶角色檢查不同的關聯
    if (user.role === 'doctor') {
      // 檢查是否存在與該醫生相關的排班
      db.get('SELECT COUNT(*) as count FROM schedule WHERE doctor_id = ?', [userId], (err, scheduleResult) => {
        if (err) {
          console.error('查詢排班錯誤:', err.message);
          return res.status(500).json({ error: '伺服器錯誤' });
        }

        // 檢查是否存在與該醫生相關的預約
        db.get('SELECT COUNT(*) as count FROM appointments WHERE doctor_id = ?', [userId], (err, appointmentResult) => {
          if (err) {
            console.error('查詢預約錯誤:', err.message);
            return res.status(500).json({ error: '伺服器錯誤' });
          }

          // 如果存在關聯數據，則提示用戶
          if (scheduleResult.count > 0 || appointmentResult.count > 0) {
            return res.status(409).json({
              error: '無法刪除此用戶，因為存在關聯的排班或預約數據',
              canProceed: false,
              scheduleCount: scheduleResult.count,
              appointmentCount: appointmentResult.count,
              reason: 'has_related_data'
            });
          } else {
            // 沒有關聯數據，可以安全刪除
            proceedToDelete();
          }
        });
      });
    } else if (user.role === 'patient') {
      // 檢查是否存在與該患者相關的預約
      db.get('SELECT COUNT(*) as count FROM appointments WHERE patient_id = ?', [userId], (err, result) => {
        if (err) {
          console.error('查詢預約錯誤:', err.message);
          return res.status(500).json({ error: '伺服器錯誤' });
        }

        if (result.count > 0) {
          return res.status(409).json({
            error: '無法刪除此用戶，因為存在關聯的預約數據',
            canProceed: false,
            appointmentCount: result.count,
            reason: 'has_related_data'
          });
        } else {
          // 沒有關聯數據，可以安全刪除
          proceedToDelete();
        }
      });
    } else {
      // 其他角色，直接刪除
      proceedToDelete();
    }
  }

  function proceedToDelete() {
    // 刪除用戶
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        console.error('刪除用戶錯誤:', err.message);
        return res.status(500).json({ error: '無法刪除用戶' });
      }

      res.json({ 
        message: '用戶已成功刪除',
        canProceed: true
      });
    });
  }
};

// 獲取醫生列表
const getDoctors = (db) => (req, res) => {
  console.log('[DEBUG] Entered getDoctors function');
  
  // 先查詢表結構
  db.all("PRAGMA table_info(users)", [], (err, columns) => {
    if (err) {
      console.error('[ERROR] 無法獲取用戶表結構:', err.message);
      return res.status(500).json({ error: '無法獲取醫生列表 - 結構查詢錯誤' });
    }
    
    // 查看有哪些欄位可用
    console.log('[DEBUG] 用戶表欄位:', columns.map(c => c.name).join(', '));
    
    // 必須確保有 role 欄位才能查詢醫生
    if (!columns.some(c => c.name === 'role')) {
      console.error('[ERROR] 用戶表缺少 role 欄位，無法查詢醫生');
      return res.status(500).json({ error: '無法獲取醫生列表 - 缺少必要欄位' });
    }
    
    // 構建依據表結構的查詢
    const hasName = columns.some(c => c.name === 'name');
    const hasEmail = columns.some(c => c.name === 'email');
    const hasUsername = columns.some(c => c.name === 'username');
    const hasCreatedAt = columns.some(c => c.name === 'created_at');
    const hasUpdatedAt = columns.some(c => c.name === 'updated_at');
    
    // 構建SELECT部分
    let selectFields = ['id'];
    
    if (hasName) selectFields.push('name');
    if (hasEmail) selectFields.push('email');
    else if (hasUsername) selectFields.push('username as email');  // 如果沒有email但有username，用username代替
    if (hasCreatedAt) selectFields.push('created_at');
    if (hasUpdatedAt) selectFields.push('updated_at');
    
    const query = `
      SELECT ${selectFields.join(', ')} 
      FROM users 
      WHERE role = 'doctor'
      ORDER BY ${hasName ? 'name' : 'id'}
    `;
    
    console.log('[DEBUG] 執行醫生查詢:', query);
    
    db.all(query, [], (err, doctors) => {
      console.log('[DEBUG] getDoctors - db.all callback entered'); 
      if (err) {
        console.error('[ERROR] SQL error in getDoctors:', err.message);
        console.error('[ERROR] Failed Query in getDoctors:', query);
        return res.status(500).json({ success: false, error: '無法獲取醫生列表' });
      }
      console.log('[DEBUG] getDoctors successful, result count:', doctors ? doctors.length : 0);
      res.json({ success: true, doctors: doctors || [] }); 
    });
  });
};

// 強制刪除用戶及其所有關聯數據
const deleteUserWithRelatedData = (db) => (req, res) => {
  const { userId } = req.params;
  const { confirm, force } = req.body;

  // 安全檢查：必須提供確認標記
  if (!confirm || confirm !== 'CASCADE_DELETE_CONFIRMED') {
    return res.status(400).json({ 
      error: '必須提供明確的確認標記才能執行級聯刪除',
      canProceed: false
    });
  }

  // 檢查用戶是否存在
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('查詢用戶錯誤:', err.message);
      return res.status(500).json({ error: '伺服器錯誤' });
    }

    if (!user) {
      return res.status(404).json({ error: '用戶不存在' });
    }

    // 防止刪除最後一個管理員帳戶
    if (user.role === 'admin') {
      db.get('SELECT COUNT(*) as count FROM users WHERE role = "admin"', [], (err, result) => {
        if (err) {
          console.error('查詢管理員數量錯誤:', err.message);
          return res.status(500).json({ error: '伺服器錯誤' });
        }

        if (result.count <= 1) {
          return res.status(409).json({ 
            error: '無法刪除最後一個管理員帳戶，即使使用級聯刪除',
            canProceed: false,
            reason: 'last_admin'
          });
        } else {
          // 有多個管理員，可以繼續刪除
          beginCascadeDelete(user);
        }
      });
    } else {
      // 非管理員帳戶，直接開始級聯刪除
      beginCascadeDelete(user);
    }
  });

  function beginCascadeDelete(user) {
    console.log(`開始級聯刪除用戶 ID ${userId} (${user.name}, 角色: ${user.role})`);
    
    // 啟動資料庫事務以確保原子性
    db.run('BEGIN TRANSACTION', (err) => {
      if (err) {
        console.error('開始事務錯誤:', err.message);
        return res.status(500).json({ error: '無法啟動刪除事務' });
      }

      const operations = [];
      const results = { deleted: {} };

      // 根據用戶角色添加不同的刪除操作
      if (user.role === 'doctor') {
        // 1. 刪除與該醫生相關的排班
        operations.push(new Promise((resolve, reject) => {
          db.run('DELETE FROM schedule WHERE doctor_id = ?', [userId], function(err) {
            if (err) {
              console.error('刪除醫生排班錯誤:', err.message);
              return reject(err);
            }
            results.deleted.schedules = this.changes;
            resolve();
          });
        }));

        // 2. 刪除與該醫生相關的預約
        operations.push(new Promise((resolve, reject) => {
          db.run('DELETE FROM appointments WHERE doctor_id = ?', [userId], function(err) {
            if (err) {
              console.error('刪除醫生預約錯誤:', err.message);
              return reject(err);
            }
            results.deleted.doctorAppointments = this.changes;
            resolve();
          });
        }));
      } else if (user.role === 'patient') {
        // 刪除與該患者相關的預約
        operations.push(new Promise((resolve, reject) => {
          db.run('DELETE FROM appointments WHERE patient_id = ?', [userId], function(err) {
            if (err) {
              console.error('刪除患者預約錯誤:', err.message);
              return reject(err);
            }
            results.deleted.patientAppointments = this.changes;
            resolve();
          });
        }));
      }

      // 執行所有刪除操作
      Promise.all(operations)
        .then(() => {
          // 最後刪除用戶本身
          db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
            if (err) {
              console.error('刪除用戶錯誤:', err.message);
              db.run('ROLLBACK', () => {
                return res.status(500).json({ error: '刪除用戶失敗，已回滾所有更改' });
              });
              return;
            }

            results.deleted.user = this.changes;

            // 提交事務
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('提交事務錯誤:', err.message);
                db.run('ROLLBACK', () => {
                  return res.status(500).json({ error: '提交刪除事務失敗，已回滾所有更改' });
                });
                return;
              }

              console.log(`級聯刪除用戶 ID ${userId} 成功完成`, results);
              res.json({
                message: '用戶及其關聯數據已成功刪除',
                results: results,
                canProceed: true
              });
            });
          });
        })
        .catch(err => {
          console.error('級聯刪除操作錯誤:', err.message);
          db.run('ROLLBACK', () => {
            return res.status(500).json({ error: '刪除關聯數據失敗，已回滾所有更改' });
          });
        });
    });
  }
};

// 最終的模組導出，必須放在最後
module.exports = (db) => ({
  getAllUsers: getAllUsers(db),
  getUserById: getUserById(db),
  updateUser: updateUser(db),
  deleteUser: deleteUser(db),
  getDoctors: getDoctors(db),
  deleteUserWithRelatedData: deleteUserWithRelatedData(db)
}); 