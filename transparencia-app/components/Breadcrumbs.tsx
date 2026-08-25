import Link from "@/components/SiteLink";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Migas de pan" className="breadcrumbs-nav">
      <ol className="breadcrumbs-list">
        <li className="breadcrumbs-item">
          <Link href="/" className="breadcrumbs-link">Inicio</Link>
        </li>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="breadcrumbs-item">
              <span className="breadcrumbs-separator" aria-hidden="true">/</span>
              {isLast || !item.href ? (
                <span className="breadcrumbs-current" aria-current="page" title={item.label}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="breadcrumbs-link">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
