import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
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

type FocusPosition = 'first' | 'last';

const MENU_ITEM_SELECTOR = '[data-toolbar-menuitem="true"]:not(:disabled)';
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// ============================================================================
// Helpers
// ============================================================================

const getMenuItems = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR));
};

const getFocusableElements = (container: HTMLElement | null): HTMLElement[] => {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
};

const focusMenuTarget = (container: HTMLElement | null, position: FocusPosition = 'first') => {
  const menuItems = getMenuItems(container);
  const candidates = menuItems.length > 0 ? menuItems : getFocusableElements(container);
  if (!candidates.length) {
    return false;
  }

  const target = position === 'last' ? candidates[candidates.length - 1] : candidates[0];
  target.focus();
  return true;
};

const moveMenuFocus = (container: HTMLElement | null, currentTarget: HTMLElement | null, direction: 1 | -1) => {
  const menuItems = getMenuItems(container);
  if (!menuItems.length) {
    return;
  }

  const currentItem = currentTarget?.closest<HTMLElement>(MENU_ITEM_SELECTOR) ?? null;
  const currentIndex = currentItem ? menuItems.indexOf(currentItem) : -1;
  const nextIndex =
    currentIndex === -1
      ? direction === 1 ? 0 : menuItems.length - 1
      : (currentIndex + direction + menuItems.length) % menuItems.length;

  menuItems[nextIndex]?.focus();
};

const renderCheckmark = (checked?: boolean) => (
  <span className={`toolbar-menu-item-check${checked ? ' toolbar-menu-item-check--checked' : ''}`}>
    ✓
  </span>
);

const renderActionItem = (item: MenuItemAction, onActivate: () => void) => {
  const hasCheckState = typeof item.checked === 'boolean';
  return (
    <button
      key={item.label}
      type="button"
      className="toolbar-menu-item"
      role={hasCheckState ? 'menuitemcheckbox' : 'menuitem'}
      aria-checked={hasCheckState ? item.checked : undefined}
      data-toolbar-menuitem="true"
      tabIndex={-1}
      onClick={onActivate}
      disabled={item.disabled}
    >
      {renderCheckmark(item.checked)}
      {item.icon && <span className="toolbar-menu-item-icon">{item.icon}</span>}
      <span className="toolbar-menu-item-label">{item.label}</span>
      {item.shortcut && (
        <span className="toolbar-menu-item-shortcut">{item.shortcut}</span>
      )}
    </button>
  );
};

// ============================================================================
// Icons
// ============================================================================

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

// ============================================================================
// SubmenuItem Component
// ============================================================================

interface SubmenuItemProps {
  item: MenuItemSubmenu;
  onCloseAll?: () => void;
}

const SubmenuItem: React.FC<SubmenuItemProps> = ({ item, onCloseAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const requestedFocusRef = useRef<FocusPosition | null>(null);
  const submenuId = useId().replace(/:/g, '');

  const clearCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const openSubmenu = useCallback((focusPosition?: FocusPosition) => {
    clearCloseTimer();
    requestedFocusRef.current = focusPosition ?? null;
    setIsOpen(true);
  }, []);

  const closeSubmenu = useCallback((focusTrigger = false) => {
    clearCloseTimer();
    setIsOpen(false);
    requestedFocusRef.current = null;

    if (focusTrigger) {
      requestAnimationFrame(() => {
        buttonRef.current?.focus();
      });
    }
  }, []);

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  useEffect(() => {
    if (!isOpen || !requestedFocusRef.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      focusMenuTarget(menuRef.current, requestedFocusRef.current ?? 'first');
      requestedFocusRef.current = null;
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const handleMouseEnter = () => {
    openSubmenu();
  };

  const handleMouseLeave = () => {
    clearCloseTimer();
    timeoutRef.current = setTimeout(() => {
      closeSubmenu();
    }, 150);
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'Enter':
      case ' ': {
        event.preventDefault();
        event.stopPropagation();
        openSubmenu('first');
        return;
      }
      case 'ArrowLeft': {
        if (!isOpen) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        closeSubmenu(true);
        return;
      }
      default:
        return;
    }
  };

  const handleSubmenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentTarget = event.target instanceof HTMLElement ? event.target : null;

    switch (event.key) {
      case 'Escape':
      case 'ArrowLeft': {
        event.preventDefault();
        event.stopPropagation();
        closeSubmenu(true);
        return;
      }
      case 'ArrowDown':
      case 'ArrowUp': {
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        event.preventDefault();
        event.stopPropagation();
        moveMenuFocus(menuRef.current, currentTarget, direction);
        return;
      }
      case 'Home':
      case 'End': {
        event.preventDefault();
        event.stopPropagation();
        focusMenuTarget(menuRef.current, event.key === 'Home' ? 'first' : 'last');
        return;
      }
      default:
        return;
    }
  };

  const renderSubmenuItem = (subItem: MenuItem, index: number) => {
    if (subItem.type === 'divider') {
      return <div key={`divider-${index}`} className="toolbar-menu-divider" role="separator" />;
    }

    if (subItem.type === 'custom') {
      const content = typeof subItem.render === 'function' ? subItem.render() : subItem.render;
      return (
        <div key={`custom-${index}`} className={`toolbar-menu-custom ${subItem.className ?? ''}`} role="none">
          {content}
        </div>
      );
    }

    if (subItem.type === 'submenu') {
      return <SubmenuItem key={subItem.label} item={subItem} onCloseAll={onCloseAll} />;
    }

    return renderActionItem(subItem, () => {
      subItem.onClick?.();
      onCloseAll?.();
    });
  };

  return (
    <div
      className="toolbar-submenu-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="none"
    >
      <button
        ref={buttonRef}
        type="button"
        className="toolbar-menu-item toolbar-menu-item--submenu"
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={`toolbar-submenu-${submenuId}`}
        data-toolbar-menuitem="true"
        tabIndex={-1}
        onClick={() => {
          if (isOpen) {
            closeSubmenu();
          } else {
            openSubmenu('first');
          }
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        {renderCheckmark(false)}
        {item.icon && <span className="toolbar-menu-item-icon">{item.icon}</span>}
        <span className="toolbar-menu-item-label">{item.label}</span>
        <ChevronRightIcon className="toolbar-submenu-arrow" />
      </button>
      {isOpen && (
        <div
          id={`toolbar-submenu-${submenuId}`}
          ref={menuRef}
          className="toolbar-submenu"
          role="menu"
          aria-label={item.label}
          onKeyDown={handleSubmenuKeyDown}
        >
          {item.items.map(renderSubmenuItem)}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DropdownMenu Component
// ============================================================================

interface DropdownMenuProps {
  menu: MenuConfig;
  menuIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
  onMoveToMenu: (fromIndex: number, direction: 1 | -1, openTarget: boolean) => void;
  registerTriggerRef: (node: HTMLButtonElement | null) => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  menu,
  menuIndex,
  isOpen,
  onToggle,
  onOpen,
  onClose,
  onMoveToMenu,
  registerTriggerRef,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const requestedFocusRef = useRef<FocusPosition | null>(null);
  const baseId = useId().replace(/:/g, '');
  const buttonId = `toolbar-trigger-${baseId}`;
  const menuId = `toolbar-menu-${baseId}`;

  const setButtonRef = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;
    registerTriggerRef(node);
  }, [registerTriggerRef]);

  const focusMenu = useCallback((focusPosition: FocusPosition) => {
    requestedFocusRef.current = focusPosition;
    if (isOpen) {
      requestAnimationFrame(() => {
        focusMenuTarget(menuRef.current, focusPosition);
        requestedFocusRef.current = null;
      });
      return;
    }

    onOpen();
  }, [isOpen, onOpen]);

  useEffect(() => {
    if (!isOpen || !requestedFocusRef.current) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      focusMenuTarget(menuRef.current, requestedFocusRef.current ?? 'first');
      requestedFocusRef.current = null;
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

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
        requestAnimationFrame(() => {
          buttonRef.current?.focus();
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'Enter':
      case ' ': {
        event.preventDefault();
        focusMenu('first');
        return;
      }
      case 'ArrowUp': {
        event.preventDefault();
        focusMenu('last');
        return;
      }
      case 'ArrowRight': {
        event.preventDefault();
        onMoveToMenu(menuIndex, 1, isOpen);
        return;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        onMoveToMenu(menuIndex, -1, isOpen);
        return;
      }
      default:
        return;
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentTarget = event.target instanceof HTMLElement ? event.target : null;
    const currentMenuItem = currentTarget?.closest<HTMLElement>(MENU_ITEM_SELECTOR) ?? null;

    switch (event.key) {
      case 'Escape': {
        event.preventDefault();
        onClose();
        buttonRef.current?.focus();
        return;
      }
      case 'Tab': {
        onClose();
        return;
      }
      case 'Home':
      case 'End': {
        if (!currentMenuItem) {
          return;
        }
        event.preventDefault();
        focusMenuTarget(menuRef.current, event.key === 'Home' ? 'first' : 'last');
        return;
      }
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!currentMenuItem) {
          return;
        }
        event.preventDefault();
        moveMenuFocus(menuRef.current, currentMenuItem, event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'ArrowRight': {
        if (!currentMenuItem || currentMenuItem.getAttribute('aria-haspopup') === 'menu') {
          return;
        }
        event.preventDefault();
        onMoveToMenu(menuIndex, 1, true);
        return;
      }
      case 'ArrowLeft': {
        if (!currentMenuItem || currentMenuItem.getAttribute('aria-haspopup') === 'menu') {
          return;
        }
        event.preventDefault();
        onMoveToMenu(menuIndex, -1, true);
        return;
      }
      default:
        return;
    }
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.type === 'divider') {
      return <div key={`divider-${index}`} className="toolbar-menu-divider" role="separator" />;
    }

    if (item.type === 'custom') {
      const content = typeof item.render === 'function' ? item.render() : item.render;
      return (
        <div key={`custom-${index}`} className={`toolbar-menu-custom ${item.className ?? ''}`} role="none">
          {content}
        </div>
      );
    }

    if (item.type === 'submenu') {
      return <SubmenuItem key={item.label} item={item} onCloseAll={onClose} />;
    }

    return renderActionItem(item, () => {
      item.onClick?.();
      onClose();
    });
  };

  return (
    <div className="toolbar-dropdown" role="none">
      <button
        id={buttonId}
        ref={setButtonRef}
        type="button"
        className={`toolbar-menu-trigger${isOpen ? ' toolbar-menu-trigger--open' : ''}`}
        role="menuitem"
        onClick={onToggle}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        {menu.label}
      </button>
      {isOpen && (
        <div
          id={menuId}
          ref={menuRef}
          className="toolbar-menu"
          role="menu"
          aria-labelledby={buttonId}
          onKeyDown={handleMenuKeyDown}
        >
          {menu.items.map(renderMenuItem)}
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
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusTrigger = useCallback((index: number) => {
    requestAnimationFrame(() => {
      triggerRefs.current[index]?.focus();
    });
  }, []);

  const handleMenuToggle = useCallback((index: number) => {
    setOpenMenuIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleMenuOpen = useCallback((index: number) => {
    setOpenMenuIndex(index);
  }, []);

  const handleMenuClose = useCallback(() => {
    setOpenMenuIndex(null);
  }, []);

  const handleMoveToMenu = useCallback((fromIndex: number, direction: 1 | -1, openTarget: boolean) => {
    if (!menus.length) {
      return;
    }

    const nextIndex = (fromIndex + direction + menus.length) % menus.length;
    setOpenMenuIndex(openTarget ? nextIndex : null);
    focusTrigger(nextIndex);
  }, [focusTrigger, menus.length]);

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
        <nav className="toolbar-menus" aria-label="Application menus" role="menubar">
          {menus.map((menu, index) => (
            <DropdownMenu
              key={menu.label}
              menu={menu}
              menuIndex={index}
              isOpen={openMenuIndex === index}
              onToggle={() => handleMenuToggle(index)}
              onOpen={() => handleMenuOpen(index)}
              onClose={handleMenuClose}
              onMoveToMenu={handleMoveToMenu}
              registerTriggerRef={(node) => {
                triggerRefs.current[index] = node;
              }}
            />
          ))}
        </nav>
      </div>
      {rightContent && <div className="toolbar-right">{rightContent}</div>}
    </header>
  );
};

export default Toolbar;
