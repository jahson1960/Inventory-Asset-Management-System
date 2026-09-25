import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@/components/icons/form-icons';

/** Numbered circular badge + title (and optional description) heading a form's card section,
 *  e.g. "① Asset Details". Used to break a long create/edit form into visually distinct steps. */
export function SectionHeader({ number, title, description }: { number: number; title: string; description?: string }) {
  return (
    <div className="mb-5 border-b border-slate-100 pb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-white">
          {number}
        </span>
        <h2 className="text-base font-bold text-navy">{title}</h2>
      </div>
      {description && <p className="mt-1 ml-11 text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function Required() {
  return <span className="text-red-500">*</span>;
}

/** Wraps a form control with a small leading icon inside the field. Pass `pl-9` on the control's
 *  own className to make room for it. `align="top"` positions the icon at the top for a
 *  multi-line Textarea instead of vertically centering it. */
export function IconInput({ icon, align = 'center', children }: { icon: ReactNode; align?: 'center' | 'top'; children: ReactNode }) {
  return (
    <div className="relative">
      <span
        className={
          align === 'top'
            ? 'pointer-events-none absolute left-3 top-3 text-slate-400'
            : 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'
        }
      >
        {icon}
      </span>
      {children}
    </div>
  );
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** A page header for multi-section forms: a rounded icon badge, title/description, and a
 *  breadcrumb trail on the right (Home icon, then each item; the last item is plain text). */
export function FormPageHeader({
  icon,
  title,
  description,
  breadcrumb,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  breadcrumb: BreadcrumbItem[];
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy text-white">{icon}</div>
        <div>
          <h1 className="text-2xl font-bold text-navy">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <nav className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
        <HomeIcon className="h-3.5 w-3.5" />
        {breadcrumb.map((item, index) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <ChevronRightIcon className="h-3 w-3" />
            {item.href ? (
              <Link href={item.href} className="hover:text-gold-dark">
                {item.label}
              </Link>
            ) : (
              <span className={index === breadcrumb.length - 1 ? 'font-medium text-slate-700' : undefined}>{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
