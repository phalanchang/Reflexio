import React from 'react';
import './WishFilter.css';

const PRIORITY_OPTIONS = [
  { value: 'high', label: '高', className: 'filter-priority-high' },
  { value: 'medium', label: '中', className: 'filter-priority-medium' },
  { value: 'low', label: '低', className: 'filter-priority-low' }
];

function WishFilter({ tags, selectedTags, onTagsChange, selectedPriorities, onPrioritiesChange, onReset }) {
  const toggleTag = (tagName) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter(t => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const togglePriority = (priority) => {
    if (selectedPriorities.includes(priority)) {
      onPrioritiesChange(selectedPriorities.filter(p => p !== priority));
    } else {
      onPrioritiesChange([...selectedPriorities, priority]);
    }
  };

  const hasActiveFilters = selectedTags.length > 0 || selectedPriorities.length > 0;

  return (
    <div className="wish-filter">
      {tags.length > 0 && (
        <div className="filter-row">
          <span className="filter-label">タグ:</span>
          <div className="filter-options">
            {tags.map(tag => (
              <button
                key={tag.id}
                type="button"
                className={`filter-chip filter-chip-tag ${selectedTags.includes(tag.name) ? 'filter-chip-active' : ''}`}
                onClick={() => toggleTag(tag.name)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="filter-row">
        <span className="filter-label">優先度:</span>
        <div className="filter-options">
          {PRIORITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`filter-chip ${opt.className} ${selectedPriorities.includes(opt.value) ? 'filter-chip-active' : ''}`}
              onClick={() => togglePriority(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {hasActiveFilters && (
          <button type="button" className="filter-reset" onClick={onReset}>
            リセット
          </button>
        )}
      </div>
    </div>
  );
}

export default WishFilter;
