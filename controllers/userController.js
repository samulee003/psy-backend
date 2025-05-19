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

    // 刪除用戶
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        console.error('刪除用戶錯誤:', err.message);
        return res.status(500).json({ error: '無法刪除用戶' });
      }

      res.json({ message: '用戶已成功刪除' });
    });
  });
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
        return res.status(500).json({ error: '無法獲取醫生列表' });
      }
      console.log('[DEBUG] getDoctors successful, result count:', doctors ? doctors.length : 0);
      res.json({ doctors: doctors || [] }); 
    });
  });
};

module.exports = (db) => ({
  getAllUsers: getAllUsers(db),
  getUserById: getUserById(db),
  updateUser: updateUser(db),
  deleteUser: deleteUser(db),
  getDoctors: getDoctors(db)
}); 