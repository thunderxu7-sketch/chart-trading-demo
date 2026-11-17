import type { MetadataRoute } from 'next';
import { origin } from '@/lib/server/seo';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/markets/eth-musd', '/trade/eth-musd', '/faq'].map(path => ({ url: new URL(path, origin).toString(), changeFrequency: 'weekly', priority: path === '/' ? 1 : .8 }));
}
