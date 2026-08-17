import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getAdminEmails } from '@/lib/auth';
import { findTenantForDebug, getPassVisibilityReport } from '@/lib/pass-visibility-debug';

type BatchRequestBody = {
  tenantSlug?: string;
  clerkUserIds?: string[];
};

const MAX_BATCH_SIZE = 200;

export async function POST(request: NextRequest) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requesterEmail = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase();
    const isAdminRequester = !!requesterEmail && getAdminEmails().includes(requesterEmail);
    if (!isAdminRequester) {
      return NextResponse.json(
        { error: 'Forbidden: only admin emails can run batch visibility diagnostics' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as BatchRequestBody;
    const tenantSlug = body.tenantSlug?.trim();
    const clerkUserIds = Array.from(
      new Set((body.clerkUserIds || []).map((id) => id.trim()).filter(Boolean))
    );

    if (!tenantSlug) {
      return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 });
    }

    if (clerkUserIds.length === 0) {
      return NextResponse.json({ error: 'clerkUserIds must contain at least one user id' }, { status: 400 });
    }

    if (clerkUserIds.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `clerkUserIds cannot exceed ${MAX_BATCH_SIZE} entries` },
        { status: 400 }
      );
    }

    const tenant = await findTenantForDebug(tenantSlug);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const results = await Promise.all(
      clerkUserIds.map(async (clerkUserId) => getPassVisibilityReport(tenant._id, clerkUserId))
    );

    const summary = results.reduce(
      (acc, result) => {
        acc.totalUsers += 1;
        if (result.visibleActiveSubscriptionsCount > 0) {
          acc.usersWithVisiblePasses += 1;
        } else {
          acc.usersWithoutVisiblePasses += 1;
        }

        for (const [type, count] of Object.entries(result.visibleActiveByType)) {
          acc.visiblePassesByType[type] = (acc.visiblePassesByType[type] || 0) + count;
        }

        for (const hidden of result.hiddenSubscriptions) {
          acc.hiddenByReason[hidden.reason] = (acc.hiddenByReason[hidden.reason] || 0) + 1;
        }

        acc.totalVisibleSubscriptions += result.visibleActiveSubscriptionsCount;
        acc.totalHiddenSubscriptions += result.hiddenSubscriptions.length;
        return acc;
      },
      {
        totalUsers: 0,
        usersWithVisiblePasses: 0,
        usersWithoutVisiblePasses: 0,
        totalVisibleSubscriptions: 0,
        totalHiddenSubscriptions: 0,
        visiblePassesByType: {} as Record<string, number>,
        hiddenByReason: {} as Record<string, number>,
      }
    );

    return NextResponse.json({
      tenant: { id: tenant._id, schoolName: tenant.schoolName, slugRequested: tenantSlug },
      requestedCount: clerkUserIds.length,
      summary,
      results,
    });
  } catch (error) {
    console.error('Error running batch pass visibility diagnostics:', error);
    return NextResponse.json(
      {
        error: 'Failed to run batch pass visibility diagnostics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
