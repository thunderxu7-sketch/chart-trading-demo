import 'server-only';
import type { Metadata } from 'next';
export const origin = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
export function metadata(title: string, description: string, pathname: string): Metadata {
  const url = new URL(pathname, origin).toString();
  return { title, description, alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website', locale: 'zh_CN', siteName: 'ARC Exchange' } };
}
