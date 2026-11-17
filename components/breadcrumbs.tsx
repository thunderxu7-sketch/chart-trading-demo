import Link from 'next/link';
import { origin } from '@/lib/server/seo';
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  const schema = { '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: new URL(item.path, origin).toString() })) };
  // Trade-off: JSON-LD is server rendered; escape '<' to prevent a future
  // untrusted market name from ending this script element (JSON is not HTML).
  return <><nav aria-label="面包屑" className="breadcrumbs">{items.map((item,i) => <span key={item.path}>{i > 0 && <b>/</b>}<Link prefetch={false} href={item.path} aria-current={i === items.length - 1 ? 'page' : undefined}>{item.name}</Link></span>)}</nav>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /></>;
}
