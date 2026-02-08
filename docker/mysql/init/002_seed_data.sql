USE reflexio;

-- Default admin user (password: password123)
INSERT INTO users (username, password_hash, display_name) VALUES
('admin', '$2b$10$WKDYJq5kszW2KVEYudIFw.LDMipEQJr9OSx6XKkzhAfc0m7lCM8te', 'Administrator');
