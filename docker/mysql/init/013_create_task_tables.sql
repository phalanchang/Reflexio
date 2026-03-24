-- タスク管理機能テーブル
-- task_templates: タスク定義（通常/Daily/曜日）
-- task_instances: タスクインスタンス（実行単位）

CREATE TABLE IF NOT EXISTS task_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    task_type ENUM('normal', 'daily', 'weekday') NOT NULL DEFAULT 'normal',
    trigger_time TIME DEFAULT '09:00:00',
    weekdays JSON DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_user_type (user_id, task_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_instances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT DEFAULT NULL,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    task_type ENUM('normal', 'daily', 'weekday') NOT NULL DEFAULT 'normal',
    scheduled_date DATE NOT NULL,
    status ENUM('pending', 'completed', 'skipped') NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date_status (user_id, scheduled_date, status),
    UNIQUE KEY uk_template_date (template_id, scheduled_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
