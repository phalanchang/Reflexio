USE reflexio;

-- タグテーブル（ユーザー固有）
CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_tag (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- wish-tag 中間テーブル（多対多）
CREATE TABLE IF NOT EXISTS wish_tags (
    wish_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (wish_id, tag_id),
    FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
