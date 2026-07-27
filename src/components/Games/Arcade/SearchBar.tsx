import React from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('games.search')}
        className="w-full pl-10 pr-9 py-2.5 rounded-xl
          bg-card border border-border/60
          text-sm text-foreground placeholder:text-muted/60
          focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20
          transition-all duration-200"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
