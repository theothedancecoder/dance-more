import type { MetadataRoute } from 'next';

function toTitleCase(value: string) {
  return value
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export default async function manifest({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<MetadataRoute.Manifest> {
  const { slug } = await params;
  const tenantName = toTitleCase(slug) || 'Dance School';
  const tenantBasePath = `/${slug}`;

  return {
    name: `${tenantName} | Dance School`,
    short_name: tenantName,
    description: `${tenantName} dance school app`,
    start_url: tenantBasePath,
    scope: tenantBasePath,
    id: tenantBasePath,
    display: 'standalone',
    background_color: '#f5f3ff',
    theme_color: '#7c3aed',
    orientation: 'portrait',
    categories: ['education', 'lifestyle'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon-192.png?v=3',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon-512.png?v=3',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };
}
