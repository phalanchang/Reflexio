USE reflexio;

-- voice_recordings テーブル
CREATE TABLE IF NOT EXISTS voice_recordings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL,
    duration_seconds DECIMAL(8,2) DEFAULT NULL,
    mime_type VARCHAR(50) NOT NULL DEFAULT 'audio/webm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_recordings (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- transcriptions テーブル
CREATE TABLE IF NOT EXISTS transcriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recording_id INT NOT NULL,
    user_id INT NOT NULL,
    raw_text TEXT DEFAULT NULL,
    language VARCHAR(10) DEFAULT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'pending',
    error_message TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (recording_id) REFERENCES voice_recordings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_recording (recording_id),
    INDEX idx_user_transcriptions (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
