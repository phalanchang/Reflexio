import React, { useEffect } from 'react';
import './SkillModal.css';

const CATEGORY_LABELS = {
  skills: { label: 'Skill', className: 'skill-modal-cat-blue' },
  mcp: { label: 'MCP', className: 'skill-modal-cat-purple' },
  integrations: { label: 'Integration', className: 'skill-modal-cat-green' }
};

function SkillModal({ skill, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!skill) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const cat = CATEGORY_LABELS[skill.category] || CATEGORY_LABELS.skills;

  return (
    <div className="skill-modal-overlay" onClick={handleOverlayClick}>
      <div className="skill-modal-content">
        <button className="skill-modal-close" onClick={onClose}>
          &times;
        </button>
        <div className="skill-modal-header">
          {skill.badges && skill.badges.length > 0 ? (
            <img
              src={skill.badges[0].image}
              alt={skill.name}
              className="skill-modal-badge-img"
            />
          ) : (
            <span className="skill-modal-icon">{skill.icon}</span>
          )}
          <h3 className="skill-modal-name">{skill.name}</h3>
        </div>
        <span className={`skill-modal-category ${cat.className}`}>
          {cat.label}
        </span>
        <p className="skill-modal-description">{skill.description}</p>
        {skill.examples && skill.examples.length > 0 && (
          <div className="skill-modal-examples">
            <h4 className="skill-modal-examples-title">使用例</h4>
            <ul className="skill-modal-examples-list">
              {skill.examples.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default SkillModal;
