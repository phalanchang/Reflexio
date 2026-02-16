USE reflexio;

INSERT INTO wishes (user_id, title, description, status, priority, due_date) VALUES
(1, 'カフェ巡りに行く', '新しくオープンしたカフェを訪れる', 'not_started', 'medium', NULL),
(1, '映画を観る', '話題の新作映画を観に行く', 'not_started', 'low', NULL),
(1, '本を読む', '積読になっている技術書を読む', 'in_progress', 'high', '2025-03-01');
