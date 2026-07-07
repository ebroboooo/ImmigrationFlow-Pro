/** Shared design tokens — single source for spacing, radius, and motion. */
export const design = {
  radius: { sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.25rem' },
  shadow: {
    card: 'shadow-sm hover:shadow-md transition-shadow duration-200',
    elevated: 'shadow-lg shadow-indigo-500/5 dark:shadow-black/20',
  },
  input:
    'w-full min-h-12 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-colors',
  btn: {
    primary:
      'inline-flex items-center justify-center gap-2 min-h-12 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-base font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
    secondary:
      'inline-flex items-center justify-center gap-2 min-h-12 px-5 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
    ghost:
      'inline-flex items-center justify-center gap-2 min-h-12 min-w-12 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
  },
  page: 'space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300',
  card: 'glass-card rounded-xl border border-gray-100 dark:border-gray-800/80',
} as const;
