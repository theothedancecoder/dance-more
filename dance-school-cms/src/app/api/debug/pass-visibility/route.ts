import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getAdminEmails } from '@/lib/auth';
import { findTenantForDebug, getPassVisibilityReport } from '@/lib/pass-visibility-debug';
import { getServerUser } from '@/lib/auth';
import { UserRole } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const tenantSlug = url.searchParams.get('tenantSlug');
    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 });
    }

    const requestedClerkUserId = url.searchParams.get('clerkUserId') || userId;
    if (requestedClerkUserId !== userId) {
      const serverUser = await getServerUser();
      const clerkUser = await currentUser();
      const requesterEmail = clerkUser?.emailAddresses[0]?.emailAddress?.toLowerCase();
      const isAdminEmailRequester = !!requesterEmail && getAdminEmails().includes(requesterEmail);
      const isTenantAdminRequester = serverUser?.role === UserRole.ADMIN;
      const isAdminRequester = isAdminEmailRequester || isTenantAdminRequester;
      if (!isAdminRequester) {
        return NextResponse.json(
          { error: 'Forbidden: tenant admin role or admin email required to inspect other users' },
          { status: 403 }
        );
      }
    }

    const tenant = await findTenantForDebug(tenantSlug);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    const report = await getPassVisibilityReport(tenant._id, requestedClerkUserId);

    return NextResponse.json({
      tenant: { id: tenant._id, schoolName: tenant.schoolName, slugRequested: tenantSlug },
      requestedClerkUserId: report.clerkUserId,
      userReferenceIds: report.userReferenceIds,
      totalSubscriptionsForUserRefs: report.totalSubscriptionsForUserRefs,
      visibleActiveSubscriptionsCount: report.visibleActiveSubscriptionsCount,
      visibleActiveByType: report.visibleActiveByType,
      visibleActiveSubscriptions: report.visibleActiveSubscriptions,
      hiddenSubscriptions: report.hiddenSubscriptions,
    });
  } catch (error) {
    console.error('Error checking pass visibility:', error);
    return NextResponse.json(
      { error: 'Failed to check pass visibility', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
