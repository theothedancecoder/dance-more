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
} | null): string {
  const baseName = pass?.name?.trim();
  const classLabel = getClassLabel(pass?.selectedClass);

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
