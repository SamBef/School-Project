import { Link } from 'react-router-dom';

/**
 * Segments: [{ label, to? }]. Last item typically has no `to` (current page).
 */
export default function AdminBreadcrumbs({ segments }) {
  if (!segments?.length) return null;
  return (
    <nav aria-label="Breadcrumb" className="admin-breadcrumbs">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={i} className="admin-breadcrumbs-item">
            {i > 0 && <span className="admin-breadcrumbs-sep" aria-hidden>/</span>}
            {isLast || !seg.to ? (
              <span className="admin-breadcrumbs-current">{seg.label}</span>
            ) : (
              <Link to={seg.to} className="admin-breadcrumbs-link">{seg.label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
