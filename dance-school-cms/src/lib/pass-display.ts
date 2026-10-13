export type PassClassLike = {
  _id?: string;
  title?: string;
  name?: string;
  danceStyle?: string;
  level?: string;
};

export function getClassLabel(classInfo?: PassClassLike | null): string | null {
  if (!classInfo) return null;

  if (classInfo.title) {
    return classInfo.title.trim();
  }

  const parts = [
    classInfo.danceStyle,
    classInfo.level,
  ].filter(Boolean) as string[];

  if (parts.length > 0) {
    return parts.join(' ');
  }

  return classInfo.name?.trim() || null;
}

export function getPassDisplayName(pass?: {
  name?: string | null;
  selectedClass?: PassClassLike | null;
  selectedClasses?: PassClassLike[] | null;
} | null): string {
  const baseName = pass?.name?.trim();
  const selectedClasses = pass?.selectedClasses?.filter(Boolean) ?? [];
  const classLabel = selectedClasses.length > 0
    ? selectedClasses.map(getClassLabel).filter(Boolean).join(' + ')
    : getClassLabel(pass?.selectedClass);

  if (!baseName && !classLabel) {
    return 'Class Pass';
  }

  if (!classLabel) {
    return baseName || 'Class Pass';
  }

  if (!baseName) {
    return classLabel;
  }

  if (baseName.toLowerCase().includes(classLabel.toLowerCase())) {
    return baseName;
  }

  return `${baseName} - ${classLabel}`;
}

export function getSubscriptionDisplayName(subscription?: {
  passName?: string | null;
  originalPass?: {
    name?: string | null;
    selectedClass?: PassClassLike | null;
    selectedClasses?: PassClassLike[] | null;
  } | null;
} | null): string {
  const passName = subscription?.passName?.trim() || subscription?.originalPass?.name?.trim() || 'Class Pass';
  const selectedClasses = subscription?.originalPass?.selectedClasses ?? (subscription?.originalPass?.selectedClass ? [subscription.originalPass.selectedClass] : []) ;

  return getPassDisplayName({
    name: passName,
    selectedClasses,
    selectedClass: subscription?.originalPass?.selectedClass,
  });
}
