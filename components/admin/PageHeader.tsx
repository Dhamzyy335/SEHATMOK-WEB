type PageHeaderProps = {
  title: string;
  description?: string;
  icon?: string;
};

export function PageHeader({ title, description, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        {icon ? (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <span className="material-symbols-outlined">{icon}</span>
          </div>
        ) : null}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
