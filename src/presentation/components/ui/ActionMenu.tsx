import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface ActionMenuItem {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  align?: 'left' | 'right';
}

const MENU_MIN_WIDTH = 176;
const MENU_ITEM_HEIGHT = 44;
const MENU_Z_INDEX = 200;

function computeMenuPosition(
  trigger: DOMRect,
  itemCount: number,
  align: 'left' | 'right',
): { top: number; left: number } {
  const menuHeight = itemCount * MENU_ITEM_HEIGHT + 8;
  const spaceBelow = window.innerHeight - trigger.bottom;
  const showAbove = spaceBelow < menuHeight && trigger.top > spaceBelow;
  const top = showAbove ? trigger.top - menuHeight - 4 : trigger.bottom + 4;
  const left = align === 'right'
    ? trigger.right - MENU_MIN_WIDTH
    : trigger.left;
  return {
    top: Math.max(8, top),
    left: Math.max(8, Math.min(left, window.innerWidth - MENU_MIN_WIDTH - 8)),
  };
}

export function ActionMenu({ items, ariaLabel = 'Actions', align = 'right' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    setMenuPos(computeMenuPosition(triggerRef.current.getBoundingClientRect(), items.length, align));
  }, [items.length, align]);

  const close = useCallback(() => {
    setOpen(false);
    setMenuPos(null);
    triggerRef.current?.focus();
  }, []);

  const openMenu = useCallback(() => {
    updatePosition();
    setFocusIndex(0);
    setOpen(true);
  }, [updatePosition]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIndex((i) => Math.min(i + 1, items.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' || e.key === ' ') {
        const item = items[focusIndex];
        if (item && !item.disabled) {
          e.preventDefault();
          close();
          item.onClick();
        }
      }
    };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, close, items, focusIndex]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const buttons = menuRef.current.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]');
    buttons[focusIndex]?.focus();
  }, [open, focusIndex]);

  const run = (item: ActionMenuItem) => {
    if (item.disabled) return;
    close();
    item.onClick();
  };

  const menu = open && menuPos && createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: MENU_Z_INDEX }}
      className="min-w-[11rem] py-1 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-100"
    >
      {items.map((item, index) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          tabIndex={index === focusIndex ? 0 : -1}
          onClick={() => run(item)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors min-h-11',
            item.destructive
              ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
            item.disabled && 'opacity-40 cursor-not-allowed',
            index === focusIndex && 'bg-gray-50 dark:bg-gray-800',
          )}
        >
          {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openMenu())}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {menu}
    </div>
  );
}
