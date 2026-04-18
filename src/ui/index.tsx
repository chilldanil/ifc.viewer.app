import React, { forwardRef, useEffect, useId, useRef } from 'react';
import './ui.css';

/* ============================================
   Button
   ============================================ */

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  block?: boolean;
  icon?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'default',
    size = 'md',
    selected,
    block,
    icon,
    className = '',
    children,
    type = 'button',
    ...props
  }, ref) => {
    const classes = [
      'ui-btn',
      variant !== 'default' && `ui-btn--${variant}`,
      size !== 'md' && `ui-btn--${size}`,
      selected && 'ui-btn--selected',
      block && 'ui-btn--block',
      icon && 'ui-btn--icon',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} type={type} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

/* ============================================
   Button Group
   ============================================ */

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  stretch?: boolean;
  vertical?: boolean;
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  stretch,
  vertical,
  className = '',
  children,
  ...props
}) => {
  const classes = [
    'ui-btn-group',
    stretch && 'ui-btn-group--stretch',
    vertical && 'ui-btn-group--vertical',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

/* ============================================
   Input
   ============================================ */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const inputId = id || (label ? `input-${generatedId}` : undefined);

    if (label) {
      return (
        <div className="ui-input-wrapper">
          <label className="ui-input-label" htmlFor={inputId}>
            {label}
          </label>
          <input ref={ref} id={inputId} className={`ui-input ${className}`} {...props} />
        </div>
      );
    }

    return <input ref={ref} className={`ui-input ${className}`} {...props} />;
  }
);

Input.displayName = 'Input';

/* ============================================
   Textarea
   ============================================ */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const textareaId = id || (label ? `textarea-${generatedId}` : undefined);

    if (label) {
      return (
        <div className="ui-input-wrapper">
          <label className="ui-input-label" htmlFor={textareaId}>
            {label}
          </label>
          <textarea ref={ref} id={textareaId} className={`ui-input ui-textarea ${className}`} {...props} />
        </div>
      );
    }

    return <textarea ref={ref} className={`ui-input ui-textarea ${className}`} {...props} />;
  }
);

Textarea.displayName = 'Textarea';

/* ============================================
   Select
   ============================================ */

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: Array<{ value: string; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', id, children, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const selectId = id || (label ? `select-${generatedId}` : undefined);

    const selectElement = (
      <select ref={ref} id={selectId} className={`ui-select ${className}`} {...props}>
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );

    if (label) {
      return (
        <div className="ui-input-wrapper">
          <label className="ui-input-label" htmlFor={selectId}>
            {label}
          </label>
          {selectElement}
        </div>
      );
    }

    return selectElement;
  }
);

Select.displayName = 'Select';

/* ============================================
   Slider
   ============================================ */

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ label, showValue = true, formatValue, className = '', value, id, ...props }, ref) => {
    const generatedId = useId().replace(/:/g, '');
    const valueId = useId().replace(/:/g, '');
    const sliderId = id || `slider-${generatedId}`;
    const describedBy = [showValue ? valueId : null, props['aria-describedby']]
      .filter(Boolean)
      .join(' ') || undefined;
    const displayValue = formatValue
      ? formatValue(Number(value))
      : String(value);

    if (label || showValue) {
      return (
        <div className="ui-slider-wrapper">
          {(label || showValue) && (
            <div className="ui-slider-header">
              {label && (
                <label className="ui-slider-label" htmlFor={sliderId}>
                  {label}
                </label>
              )}
              {showValue && (
                <span id={valueId} className="ui-slider-value">
                  {displayValue}
                </span>
              )}
            </div>
          )}
          <input
            ref={ref}
            id={sliderId}
            type="range"
            className={`ui-slider ${className}`}
            value={value}
            aria-describedby={describedBy}
            {...props}
          />
        </div>
      );
    }

    return (
      <input
        ref={ref}
        id={sliderId}
        type="range"
        className={`ui-slider ${className}`}
        value={value}
        {...props}
      />
    );
  }
);

Slider.displayName = 'Slider';

/* ============================================
   Toggle
   ============================================ */

export interface ToggleProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  checked = false,
  onChange,
  onClick,
  label,
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <button
      type={type}
      className={`ui-toggle-wrapper ${disabled ? 'ui-toggle-wrapper--disabled' : ''} ${className}`}
      onClick={handleClick}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      {...props}
    >
      <span className={`ui-toggle ${checked ? 'ui-toggle--checked' : ''}`} aria-hidden="true" />
      {label && <span className="ui-toggle-label">{label}</span>}
    </button>
  );
};

/* ============================================
   Status Box
   ============================================ */

export interface StatusProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export const Status: React.FC<StatusProps> = ({
  variant = 'info',
  className = '',
  children,
  ...props
}) => {
  const liveProps = variant === 'error'
    ? { role: 'alert' as const }
    : { role: 'status' as const, 'aria-live': 'polite' as const };

  return (
    <div className={`ui-status ui-status--${variant} ${className}`} {...liveProps} {...props}>
      {children}
    </div>
  );
};

/* ============================================
   Section
   ============================================ */

export interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  actions?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  title,
  actions,
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`ui-section ${className}`} {...props}>
      {(title || actions) && (
        <div className="ui-section-header">
          {title && <h3 className="ui-section-title">{title}</h3>}
          {actions}
        </div>
      )}
      <div className="ui-section-content">{children}</div>
    </div>
  );
};

/* ============================================
   Text
   ============================================ */

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: 'default' | 'muted' | 'subtle' | 'label';
  size?: 'xs' | 'sm' | 'base';
  as?: 'p' | 'span' | 'div';
}

export const Text: React.FC<TextProps> = ({
  variant = 'default',
  size = 'base',
  as: Component = 'p',
  className = '',
  children,
  ...props
}) => {
  const classes = [
    'ui-text',
    variant !== 'default' && `ui-text--${variant}`,
    size !== 'base' && `ui-text--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  );
};

/* ============================================
   Field (Label + Control pattern)
   ============================================ */

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  row?: boolean;
}

export const Field: React.FC<FieldProps> = ({
  label,
  row,
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`ui-field ${row ? 'ui-field--row' : ''} ${className}`} {...props}>
      {label && <span className="ui-field-label">{label}</span>}
      {children}
    </div>
  );
};

/* ============================================
   Divider
   ============================================ */

export const Divider: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => {
  return <div className={`ui-divider ${className}`} {...props} />;
};

/* ============================================
   Card
   ============================================ */

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`ui-card ${className}`} {...props}>
      {children}
    </div>
  );
};

/* ============================================
   Layout Helpers
   ============================================ */

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: 'sm' | 'md' | 'lg';
}

export const Stack: React.FC<StackProps> = ({
  gap = 'md',
  className = '',
  children,
  ...props
}) => {
  const gapClass = gap !== 'md' ? `ui-stack--${gap}` : '';
  return (
    <div className={`ui-stack ${gapClass} ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  between?: boolean;
  stretch?: boolean;
}

export const Row: React.FC<RowProps> = ({
  between,
  stretch,
  className = '',
  children,
  ...props
}) => {
  const classes = [
    'ui-row',
    between && 'ui-row--between',
    stretch && 'ui-row--stretch',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 2 | 3 | 4;
}

export const Grid: React.FC<GridProps> = ({
  cols = 2,
  className = '',
  children,
  ...props
}) => {
  return (
    <div className={`ui-grid ui-grid--${cols} ${className}`} {...props}>
      {children}
    </div>
  );
};

/* ============================================
   Modal
   ============================================ */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'sm',
  children,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId().replace(/:/g, '');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;

    const focusDialog = () => {
      const dialog = dialogRef.current;
      if (!dialog) {
        return;
      }

      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialog.focus();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    const animationFrame = window.requestAnimationFrame(focusDialog);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`ui-modal ui-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="ui-modal-header">
            <h3 id={titleId} className="ui-modal-title">{title}</h3>
            <button type="button" className="ui-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        )}
        <div className="ui-modal-body">{children}</div>
      </div>
    </div>
  );
};
