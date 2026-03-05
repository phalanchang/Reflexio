import { useEffect } from 'react';

function useKeyboardShortcuts({
  // ショートカットアクション
  onNewWish,         // N キー: 新規追加フォーム表示
  onEditWish,        // E キー: フォーカス行を編集
  onDeleteWish,      // Delete/Backspace キー: 選択行を削除
  onFocusUp,         // ↑ キー: フォーカス行を上に移動
  onFocusDown,       // ↓ キー: フォーカス行を下に移動
  onToggleCheckbox,  // Space キー: フォーカス行のチェックボックス切替
  onSearchFocus,     // / キー: 検索フィールドにフォーカス
  onEscape,          // Escape キー: フォーム/モーダル/メニュー閉じる
  onShowHelp,        // ? キー: ショートカットヘルプ表示
  // 無効化条件
  isDisabled,        // true の場合、全ショートカット無効化（フォーム・モーダル表示中）
  isTableView,       // テーブルビューかどうか（↑↓/Space/E はテーブルのみ）
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // テキスト入力中は無効化（input, textarea, select にフォーカス中）
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        // Escape だけは入力中でも有効
        if (e.key === 'Escape' && onEscape) {
          onEscape();
          e.preventDefault();
        }
        return;
      }

      // isDisabled の場合は Escape のみ有効
      if (isDisabled) {
        if (e.key === 'Escape' && onEscape) {
          onEscape();
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case 'n':
        case 'N':
          if (onNewWish) { onNewWish(); e.preventDefault(); }
          break;
        case 'e':
        case 'E':
          if (isTableView && onEditWish) { onEditWish(); e.preventDefault(); }
          break;
        case 'Delete':
        case 'Backspace':
          if (onDeleteWish) { onDeleteWish(); e.preventDefault(); }
          break;
        case 'ArrowUp':
          if (isTableView && onFocusUp) { onFocusUp(); e.preventDefault(); }
          break;
        case 'ArrowDown':
          if (isTableView && onFocusDown) { onFocusDown(); e.preventDefault(); }
          break;
        case ' ':
          if (isTableView && onToggleCheckbox) { onToggleCheckbox(); e.preventDefault(); }
          break;
        case '/':
          if (onSearchFocus) { onSearchFocus(); e.preventDefault(); }
          break;
        case 'Escape':
          if (onEscape) { onEscape(); e.preventDefault(); }
          break;
        case '?':
          if (onShowHelp) { onShowHelp(); e.preventDefault(); }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    onNewWish, onEditWish, onDeleteWish,
    onFocusUp, onFocusDown, onToggleCheckbox,
    onSearchFocus, onEscape, onShowHelp,
    isDisabled, isTableView
  ]);
}

export default useKeyboardShortcuts;
