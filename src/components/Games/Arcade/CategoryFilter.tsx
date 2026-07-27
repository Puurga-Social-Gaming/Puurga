import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface CategoryFilterProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selected,
  onSelect,
}) => {
  const { t } = useTranslation();

  const allCategories = ['all', ...categories];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {allCategories.map((cat) => {
        const isActive = selected === cat;
        const label = cat === 'all' ? t('games.allGames') : t(`games.category.${cat.toLowerCase()}`);

        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            className={`relative shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200
              ${isActive
                ? 'text-white'
                : 'text-muted hover:text-foreground hover:bg-card-hover'
              }`}
          >
            {isActive && (
              <motion.div
                layoutId="category-pill"
                className="absolute inset-0 rounded-lg bg-orange-600/90 border border-orange-500/40"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryFilter;
