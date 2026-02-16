-- カテゴリマッピングテーブル（ユーザーごとのGoogle Event Color → カスタムカテゴリ名）
CREATE TABLE IF NOT EXISTS category_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  google_color_id INT NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  display_color VARCHAR(7) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_color (user_id, google_color_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
