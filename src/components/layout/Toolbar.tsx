import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Toolbar.css';

// ============================================================================
// Types
// ============================================================================

export interface MenuItemDivider {
  type: 'divider';
}

export interface MenuItemAction {
  type?: 'action';
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  onClick?: () => void;
}

export interface MenuItemSubmenu {
  type: 'submenu';
  label: string;
  icon?: React.ReactNode;
  items: MenuItem[];
}

export interface MenuItemCustom {
  type: 'custom';
  render: React.ReactNode | (() => React.ReactNode);
  className?: string;
}

export type MenuItem = MenuItemAction | MenuItemDivider | MenuItemSubmenu | MenuItemCustom;

export interface MenuConfig {
  label: string;
  items: MenuItem[];
}

export interface ToolbarProps {
  menus?: MenuConfig[];
  rightContent?: React.ReactNode;
  className?: string;
}

// ============================================================================
// Icons
// ============================================================================

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

// ============================================================================
// DropdownMenu Component
// ============================================================================

interface DropdownMenuProps {
  menu: MenuConfig;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ menu, isOpen, onToggle, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.type === 'divider') {
      return <div key={`divider-${index}`} className="toolbar-menu-divider" />;
    }

    if (item.type === 'custom') {
      const content = typeof item.render === 'function' ? item.render() : item.render;
      return (
        <div key={`custom-${index}`} className={`toolbar-menu-custom ${item.className ?? ''}`}>
          {content}
        </div>
      );
    }

    if (item.type === 'submenu') {
      return (
        <SubmenuItem key={item.label} item={item} />
      );
    }

    const actionItem = item as MenuItemAction;
    return (
      <button
        key={actionItem.label}
        className="toolbar-menu-item"
        onClick={() => {
          actionItem.onClick?.();
          onClose();
        }}
        disabled={actionItem.disabled}
      >
        {typeof actionItem.checked === 'boolean' && (
          <span className={`toolbar-menu-item-check${actionItem.checked ? ' toolbar-menu-item-check--checked' : ''}`}>
            ✓
          </span>
        )}
        {actionItem.icon && <span className="toolbar-menu-item-icon">{actionItem.icon}</span>}
        <span className="toolbar-menu-item-label">{actionItem.label}</span>
        {actionItem.shortcut && (
          <span className="toolbar-menu-item-shortcut">{actionItem.shortcut}</span>
        )}
      </button>
    );
  };

  return (
    <div className="toolbar-dropdown">
      <button
        ref={buttonRef}
        className={`toolbar-menu-trigger${isOpen ? ' toolbar-menu-trigger--open' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {menu.label}
      </button>
      {isOpen && (
        <div ref={menuRef} className="toolbar-menu" role="menu">
          {menu.items.map(renderMenuItem)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SubmenuItem Component
// ============================================================================

interface SubmenuItemProps {
  item: MenuItemSubmenu;
}

const SubmenuItem: React.FC<SubmenuItemProps> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const renderSubmenuItem = (subItem: MenuItem, index: number) => {
    if (subItem.type === 'divider') {
      return <div key={`divider-${index}`} className="toolbar-menu-divider" />;
    }

    if (subItem.type === 'custom') {
      const content = typeof subItem.render === 'function' ? subItem.render() : subItem.render;
      return (
        <div key={`custom-${index}`} className={`toolbar-menu-custom ${subItem.className ?? ''}`}>
          {content}
        </div>
      );
    }

    if (subItem.type === 'submenu') {
      return <SubmenuItem key={subItem.label} item={subItem} />;
    }

    const actionItem = subItem as MenuItemAction;
    return (
      <button
        key={actionItem.label}
        className="toolbar-menu-item"
        onClick={actionItem.onClick}
        disabled={actionItem.disabled}
      >
        {typeof actionItem.checked === 'boolean' && (
          <span className={`toolbar-menu-item-check${actionItem.checked ? ' toolbar-menu-item-check--checked' : ''}`}>
            ✓
          </span>
        )}
        {actionItem.icon && <span className="toolbar-menu-item-icon">{actionItem.icon}</span>}
        <span className="toolbar-menu-item-label">{actionItem.label}</span>
        {actionItem.shortcut && (
          <span className="toolbar-menu-item-shortcut">{actionItem.shortcut}</span>
        )}
      </button>
    );
  };

  return (
    <div
      className="toolbar-submenu-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="toolbar-menu-item toolbar-menu-item--submenu">
        {item.icon && <span className="toolbar-menu-item-icon">{item.icon}</span>}
        <span className="toolbar-menu-item-label">{item.label}</span>
        <ChevronRightIcon className="toolbar-submenu-arrow" />
      </button>
      {isOpen && (
        <div className="toolbar-submenu" role="menu">
          {item.items.map(renderSubmenuItem)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Toolbar Component
// ============================================================================

export const Toolbar: React.FC<ToolbarProps> = ({ menus = [], rightContent, className }) => {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

  const handleMenuToggle = useCallback((index: number) => {
    setOpenMenuIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleMenuClose = useCallback(() => {
    setOpenMenuIndex(null);
  }, []);

  return (
    <header className={`toolbar${className ? ` ${className}` : ''}`}>
      <div className="toolbar-left">
        <div className="toolbar-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <nav className="toolbar-menus">
          {menus.map((menu, index) => (
            <DropdownMenu
              key={menu.label}
              menu={menu}
              isOpen={openMenuIndex === index}
              onToggle={() => handleMenuToggle(index)}
              onClose={handleMenuClose}
            />
          ))}
        </nav>
      </div>
      {rightContent && <div className="toolbar-right">{rightContent}</div>}
    </header>
  );
};

export default Toolbar;
