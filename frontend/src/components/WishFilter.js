import React from 'react';
import './WishFilter.css';

const PRIORITY_OPTIONS = [
  { value: 'high', label: '高', className: 'filter-priority-high' },
  { value: 'medium', label: '中', className: 'filter-priority-medium' },
  { value: 'low', label: '低', className: 'filter-priority-low' }
];

const SORT_OPTIONS = [
  { value: 'created_desc', label: '作成日（新しい順）' },
  { value: 'created_asc', label: '作成日（古い順）' },
  { value: 'due_asc', label: '期限（近い順）' },
  { value: 'due_desc', label: '期限（遠い順）' },
  { value: 'priority_desc', label: '優先度（高→低）' },
  { value: 'priority_asc', label: '優先度（低→高）' },
];

function WishFilter({
  tags,
  selectedTags,
  onTagsChange,
  selectedPriorities,
  onPrioritiesChange,
  onReset,
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortChange,
}) {
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

  const hasActiveFilters = selectedTags.length > 0
    || selectedPriorities.length > 0
    || searchQuery !== '';

  return (
    <div className="wish-filter">
      {/* 検索 */}
      <div className="filter-search">
        <span className="filter-search-icon">🔍</span>
        <input
          type="text"
          className="filter-search-input"
          placeholder="検索..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="filter-search-clear"
            onClick={() => onSearchChange('')}
            title="検索をクリア"
          >×</button>
        )}
      </div>

      {/* タグ */}
      {tags.length > 0 && (
        <div className="filter-group">
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

      {/* 優先度 */}
      <div className="filter-group">
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
      </div>

      {/* ソート */}
      <div className="filter-sort">
        <select
          className="filter-sort-select"
          value={sortOrder}
          onChange={(e) => onSortChange(e.target.value)}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* リセット */}
      {hasActiveFilters && (
        <button type="button" className="filter-reset" onClick={onReset}>
          リセット
        </button>
      )}
    </div>
  );
}

export default WishFilter;
