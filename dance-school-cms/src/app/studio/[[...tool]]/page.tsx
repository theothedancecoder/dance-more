import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function StudioPage() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  if (projectId) {
    redirect(`https://${projectId}.sanity.studio/`)
  }
  redirect('https://sanity.io/manage')
}
