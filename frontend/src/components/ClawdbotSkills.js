import React, { useState } from 'react';
import clawdbotSkills from './clawdbotSkillsData';
import SkillBadge from './SkillBadge';
import SkillModal from './SkillModal';
import './ClawdbotSkills.css';

function ClawdbotSkills() {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [skillsList, setSkillsList] = useState(
    clawdbotSkills.filter(s => s.category === 'skills')
  );
  const [mcpsList, setMcpsList] = useState(
    clawdbotSkills.filter(s => s.category === 'mcp')
  );
  const [integrationsList, setIntegrationsList] = useState(
    clawdbotSkills.filter(s => s.category === 'integrations')
  );

  const [draggedSkill, setDraggedSkill] = useState(null);
  const [draggedCategory, setDraggedCategory] = useState(null);

  const handleDragStart = (e, skill, category) => {
    setDraggedSkill(skill);
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedSkill(null);
    setDraggedCategory(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetSkill, category) => {
    e.preventDefault();
    if (!draggedSkill || draggedCategory !== category) return;

    const setList = category === 'skills' ? setSkillsList
      : category === 'mcp' ? setMcpsList
      : setIntegrationsList;
    const getList = category === 'skills' ? skillsList
      : category === 'mcp' ? mcpsList
      : integrationsList;

    const newList = [...getList];
    const fromIndex = newList.findIndex(s => s.id === draggedSkill.id);
    const toIndex = newList.findIndex(s => s.id === targetSkill.id);
    newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, draggedSkill);
    setList(newList);
  };

  return (
    <div className="clawdbot-skills">
      <div className="clawdbot-section-header">🤖 Clawdbot Badge</div>

      <div className="clawdbot-category">
        <div className="clawdbot-category-label">Skills</div>
        <div className="clawdbot-badge-grid">
          {skillsList.map(s => (
            <SkillBadge
              key={s.id}
              skill={s}
              onClick={setSelectedSkill}
              draggable
              onDragStart={(e) => handleDragStart(e, s, 'skills')}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, s, 'skills')}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>

      <div className="clawdbot-category">
        <div className="clawdbot-category-label">MCP</div>
        <div className="clawdbot-badge-grid">
          {mcpsList.map(s => (
            <SkillBadge
              key={s.id}
              skill={s}
              onClick={setSelectedSkill}
              draggable
              onDragStart={(e) => handleDragStart(e, s, 'mcp')}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, s, 'mcp')}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>

      <div className="clawdbot-category">
        <div className="clawdbot-category-label">Integrations</div>
        <div className="clawdbot-badge-grid">
          {integrationsList.map(s => (
            <SkillBadge
              key={s.id}
              skill={s}
              onClick={setSelectedSkill}
              draggable
              onDragStart={(e) => handleDragStart(e, s, 'integrations')}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, s, 'integrations')}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>

      {selectedSkill && (
        <SkillModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
      )}
    </div>
  );
}

export default ClawdbotSkills;
