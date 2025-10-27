declare namespace JSX {
  interface IntrinsicElements {
    'bim-panel': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string }, HTMLElement>;
    'bim-panel-section': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; collapsed?: boolean; icon?: string }, HTMLElement>;
    'bim-text-input': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { placeholder?: string; debounce?: string }, HTMLElement>;
    'bim-color-input': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; color?: string; value?: string }, HTMLElement>;
    'bim-checkbox': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; checked?: boolean; name?: string }, HTMLElement>;
    'bim-number-input': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; value?: number; min?: string | number; max?: string | number; step?: string | number; slider?: boolean; pref?: string; name?: string }, HTMLElement>;
    'bim-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; name?: string; icon?: string }, HTMLElement>;
    'bim-dropdown': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; name?: string; required?: boolean }, HTMLElement>;
    'bim-option': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { label?: string; checked?: boolean }, HTMLElement>;
    'bim-label': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}

