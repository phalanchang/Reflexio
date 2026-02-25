const clawdbotSkills = [
  // Skills（7件・hexagon・青系）
  {
    id: 'tmux',
    name: 'tmux',
    icon: '⌨️',
    category: 'skills',
    description: 'tmuxセッションのリモート操作',
    examples: ['セッション作成・切替', 'ペイン分割', 'コマンド送信'],
    style: 'hexagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'bronz', image: '/images/badges/badge_tmux_bronz.png' },
      { tier: 'sliver', image: '/images/badges/badge_tmux_sliver.png' },
      { tier: 'gold', image: '/images/badges/badge_tmux_gold.png' },
      { tier: 'platinum', image: '/images/badges/badge_tmux_platinum.png' },
    ]
  },
  {
    id: 'coding-agent',
    name: 'coding-agent',
    icon: '💻',
    category: 'skills',
    description: 'Claude Code/OpenCode実行',
    examples: ['コード生成', 'リファクタリング', 'テスト'],
    style: 'hexagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'sliver', image: '/images/badges/badge_cording-agent_sliver.png' },
    ]
  },
  {
    id: 'github',
    name: 'github',
    icon: '🐙',
    category: 'skills',
    description: 'GitHub CLI連携',
    examples: ['PR作成', 'Issue管理', 'コードレビュー'],
    style: 'hexagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'bronz', image: '/images/badges/badge_GitHub_bronz.png' },
    ]
  },
  {
    id: 'notion',
    name: 'notion',
    icon: '📝',
    category: 'skills',
    description: 'Notion API連携',
    examples: ['ページ作成', 'DB操作', 'コンテンツ管理'],
    style: 'hexagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'diamond', image: '/images/badges/badge_notion_diamond.png' },
    ]
  },
  {
    id: 'clawdhub',
    name: 'clawdhub',
    icon: '🛒',
    category: 'skills',
    description: 'Skill検索・インストール',
    examples: ['スキル検索', 'インストール', '更新'],
    style: 'hexagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'bronz', image: '/images/badges/badge_clawdhub_bronz.png' }
    ]
  },
  {
    id: 'skill-creator',
    name: 'skill-creator',
    icon: '🛠️',
    category: 'skills',
    description: 'スキル作成・管理',
    examples: ['テンプレート生成', 'バリデーション', '公開'],
    style: 'hexagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'gold', image: '/images/badges/badge_skill-creator_gold.png' },
    ]
  },
  {
    id: 'reflexio-pm-request',
    name: 'reflexio-pm-request',
    icon: '📋',
    category: 'skills',
    description: 'Reflexio PM指示送信',
    examples: ['タスク登録', '進捗確認', '報告'],
    style: 'hexagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'hihiirokane', image: '/images/badges/badge_reflexio-pm-request_hihiirokane.png' },
    ]
  },
  // MCP（1件・octagon・紫系）
  {
    id: 'drawio',
    name: 'draw.io',
    icon: '🎨',
    category: 'mcp',
    description: '図形・ダイアグラム生成',
    examples: ['アーキテクチャ図', 'フロー図', 'ER図'],
    style: 'octagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'gold', image: '/images/badges/badge_drawio_gold.png' },
    ]
  },
  // Integrations（3件・octagon・緑系）
  {
    id: 'discord',
    name: 'Discord',
    icon: '💬',
    category: 'integrations',
    description: '@メンション対応',
    examples: ['メッセージ送受信', '通知', 'Bot応答'],
    style: 'octagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'platinum', image: '/images/badges/badge_Discord_platinum.png' },
    ]
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    icon: '📅',
    category: 'integrations',
    description: '実績ログ取得',
    examples: ['予定取得', 'カテゴリ分類', 'サマリー'],
    style: 'octagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'platinum', image: '/images/badges/badge_Google-Calendar_platinum.png' },
    ]
  },
  {
    id: 'notion-integration',
    name: 'Notion',
    icon: '📋',
    category: 'integrations',
    description: 'Daily Log管理',
    examples: ['日報作成', '実績記録', '振り返り'],
    style: 'octagon',
    usage_frequency: null,
    last_used: null,
    update_frequency: null,
    heat_level: 'neutral',
    tier: null,
    badges: [
      { tier: 'platinum', image: '/images/badges/badge_notion-integration_platinum.png' }
    ]
  }
];

export default clawdbotSkills;
