import React, { useState } from 'react';
import './SkillBadge.css';

const CATEGORY_COLORS = {
  skills: 'skill-badge-blue',
  mcp: 'skill-badge-purple',
  integrations: 'skill-badge-green'
};

function SkillBadge({ skill, onClick, draggable, onDragStart, onDragOver, onDrop, onDragEnd }) {
  // ランダムバッジ選択（初回のみ）
  const [selectedBadge] = useState(() => {
    if (skill.badges && skill.badges.length > 0) {
      // tier が設定されている場合はそのティアを選択
      if (skill.tier) {
        const matched = skill.badges.find(b => b.tier === skill.tier);
        if (matched) return matched;
      }
      // ランダム選択
      return skill.badges[Math.floor(Math.random() * skill.badges.length)];
    }
    return null;
  });

  const colorClass = CATEGORY_COLORS[skill.category] || 'skill-badge-blue';
  const shapeClass = skill.style === 'octagon' ? 'skill-badge-octagon' : 'skill-badge-hexagon';
  // 画像がある場合は clip-path を無効化
  const badgeClass = selectedBadge
    ? 'skill-badge skill-badge-image'
    : `skill-badge ${shapeClass} ${colorClass}`;

  return (
    <div
      className="skill-badge-wrapper"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div
        className={badgeClass}
        title={skill.name}
        onClick={() => onClick(skill)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(skill); }}}
        tabIndex={0}
        role="button"
      >
        {selectedBadge ? (
          <img
            src={selectedBadge.image}
            alt={skill.name}
            className="skill-badge-img"
          />
        ) : (
          <span className="skill-badge-icon">{skill.icon}</span>
        )}
      </div>
      <div className="skill-badge-label">{skill.name}</div>
    </div>
  );
}

export default SkillBadge;
