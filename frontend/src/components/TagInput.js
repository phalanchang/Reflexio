import React, { useState } from 'react';
import './TagInput.css';

function TagInput({ tags = [], onChange, disabled }) {
  const [inputValue, setInputValue] = useState('');

  const addTag = (tagName) => {
    const trimmed = tagName.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    // カンマが含まれていたらタグ確定
    if (value.includes(',')) {
      const parts = value.split(',');
      parts.forEach((part, i) => {
        if (i < parts.length - 1) addTag(part);
      });
      setInputValue(parts[parts.length - 1]);
    } else {
      setInputValue(value);
    }
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="tag-input-container">
      {tags.length > 0 && (
        <div className="tag-input-tags">
          {tags.map((tag, index) => (
            <span key={index} className="tag-badge">
              {tag}
              <button type="button" onClick={() => removeTag(index)} disabled={disabled}>✕</button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="タグを入力（カンマまたはEnterで確定）"
        disabled={disabled}
        className="tag-input-field"
      />
    </div>
  );
}

export default TagInput;
