import { sanityClient } from '@/lib/sanity';
import { resolveUserReferenceIds } from '@/lib/user-references';

export type SubscriptionDebugRecord = {
  _id: string;
  type: string;
  passName?: string;
  passId?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  stripeSessionId?: string;
  purchasePrice?: number;
  userRef?: string;
  tenantRef?: string;
  legacyPassRef?: string;
};

export type TenantDebugRecord = {
  _id: string;
  schoolName: string;
};

type VisibilityResult = {
  visible: boolean;
  reason: string;
};

function isSubscriptionVisibleInTenant(
  subscription: SubscriptionDebugRecord,
  tenantId: string,
  tenantPassIds: Set<string>,
  now: Date
): VisibilityResult {
  if (!subscription.isActive) return { visible: false, reason: 'inactive' };
  if (new Date(subscription.endDate) <= now) return { visible: false, reason: 'expired' };
  if (subscription.tenantRef === tenantId) return { visible: true, reason: 'tenant_match' };

  if (!subscription.tenantRef) {
    if (subscription.passId && tenantPassIds.has(subscription.passId)) {
      return { visible: true, reason: 'legacy_tenant_resolved_from_passId' };
    }
    if (subscription.legacyPassRef && tenantPassIds.has(subscription.legacyPassRef)) {
      return { visible: true, reason: 'legacy_tenant_resolved_from_pass_ref' };
    }
    return { visible: false, reason: 'missing_tenant_and_pass_not_in_tenant' };
  }

  return { visible: false, reason: 'tenant_mismatch' };
}

export async function findTenantForDebug(tenantSlug: string): Promise<TenantDebugRecord | null> {
  let tenant = await sanityClient.fetch<TenantDebugRecord | null>(
    `*[_type == "tenant" && slug.current == $tenantSlug][0] { _id, schoolName }`,
    { tenantSlug }
  );

  if (!tenant) {
    tenant = await sanityClient.fetch<TenantDebugRecord | null>(
      `*[_type == "tenant" && subdomain.current == $tenantSlug][0] { _id, schoolName }`,
      { tenantSlug }
    );
  }

  if (!tenant) {
    tenant = await sanityClient.fetch<TenantDebugRecord | null>(
      `*[_type == "tenant" && lower(schoolName) match lower($tenantSlug + "*")][0] { _id, schoolName }`,
      { tenantSlug }
    );
  }

  return tenant;
}

export async function getPassVisibilityReport(tenantId: string, clerkUserId: string) {
  const userReferenceIds = await resolveUserReferenceIds(clerkUserId);
  const [tenantPassIds, subscriptions] = await Promise.all([
    sanityClient.fetch<string[]>(`*[_type == "pass" && tenant._ref == $tenantId]._id`, {
      tenantId,
    }),
    sanityClient.fetch<SubscriptionDebugRecord[]>(
      `*[_type == "subscription" && user._ref in $userReferenceIds] | order(_createdAt desc) {
        _id,
        type,
        passName,
        passId,
        startDate,
        endDate,
        isActive,
        stripeSessionId,
        purchasePrice,
        "userRef": user._ref,
        "tenantRef": tenant._ref,
        "legacyPassRef": pass._ref
      }`,
      { userReferenceIds }
    ),
  ]);

  const tenantPassIdSet = new Set(tenantPassIds);
  const now = new Date();
  const evaluations = subscriptions.map((subscription) => {
    const visibility = isSubscriptionVisibleInTenant(subscription, tenantId, tenantPassIdSet, now);
    return { subscription, visibility };
  });

  const visibleActiveSubscriptions = evaluations
    .filter((entry) => entry.visibility.visible)
    .map((entry) => entry.subscription);

  const hiddenSubscriptions = evaluations
    .filter((entry) => !entry.visibility.visible)
    .map((entry) => ({
      _id: entry.subscription._id,
      type: entry.subscription.type,
      passName: entry.subscription.passName,
      reason: entry.visibility.reason,
      tenantRef: entry.subscription.tenantRef || null,
    }));

  const visibleActiveByType = visibleActiveSubscriptions.reduce<Record<string, number>>((acc, sub) => {
    acc[sub.type] = (acc[sub.type] || 0) + 1;
    return acc;
  }, {});

  return {
    clerkUserId,
    userReferenceIds,
    totalSubscriptionsForUserRefs: subscriptions.length,
    visibleActiveSubscriptionsCount: visibleActiveSubscriptions.length,
    visibleActiveByType,
    visibleActiveSubscriptions,
    hiddenSubscriptions,
  };
}
