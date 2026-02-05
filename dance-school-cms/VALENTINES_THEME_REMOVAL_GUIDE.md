# Valentine's Day Theme Removal Guide

This guide will help you remove the Valentine's Day seasonal theme after the holiday.

## Quick Removal Checklist

### 1. Remove Valentine's Components

Delete these files:
```bash
rm dance-school-cms/src/components/ValentinesBanner.tsx
rm dance-school-cms/src/components/FloatingHearts.tsx
```

### 2. Update Layout (Remove Banner)

**File:** `dance-school-cms/src/app/layout.tsx`

Remove these lines:
```typescript
import ValentinesBanner from '@/components/ValentinesBanner'; // VALENTINE'S DAY - Remove after season
```

And remove:
```typescript
{/* VALENTINE'S DAY - Remove after season */}
<ValentinesBanner />
```

### 3. Update Homepage

**File:** `dance-school-cms/src/app/page.tsx`

Remove the import:
```typescript
import FloatingHearts from '@/components/FloatingHearts'; // VALENTINE'S DAY - Remove after season
```

Remove all instances of:
```typescript
{/* VALENTINE'S DAY - Remove after season */}
<FloatingHearts />
```

Search and replace all Valentine's classes back to original:
- `text-gradient-valentine` → `text-gradient-alt`
- `valentine-card` → `modern-card`
- `valentine-glass` → `glass-card`
- `gradient-valentine` → `gradient-purple-blue`
- `gradient-valentine-soft` → `gradient-pink-orange`
- `gradient-valentine-romantic` → `gradient-blue-purple`

Remove the `valentine-shimmer` class from elements.

### 4. Clean Up CSS (Optional)

**File:** `dance-school-cms/src/app/globals.css`

Remove the entire Valentine's section (lines marked with comments):
```css
/* ============================================
   VALENTINE'S DAY THEME - SEASONAL STYLES
   Remove after Valentine's Day season
   ============================================ */

... (all Valentine's styles) ...

/* ============================================
   END VALENTINE'S DAY THEME
   ============================================ */
```

## Automated Removal Script

You can also use this script to automate most of the removal:

```bash
#!/bin/bash

# Remove Valentine's components
rm dance-school-cms/src/components/ValentinesBanner.tsx
rm dance-school-cms/src/components/FloatingHearts.tsx

# Revert layout.tsx
sed -i '' "/import ValentinesBanner/d" dance-school-cms/src/app/layout.tsx
sed -i '' "/{\/\* VALENTINE'S DAY - Remove after season \*\/}/d" dance-school-cms/src/app/layout.tsx
sed -i '' "/<ValentinesBanner \/>/d" dance-school-cms/src/app/layout.tsx

# Revert page.tsx
sed -i '' "/import FloatingHearts/d" dance-school-cms/src/app/page.tsx
sed -i '' "/<FloatingHearts \/>/d" dance-school-cms/src/app/page.tsx
sed -i '' 's/text-gradient-valentine/text-gradient-alt/g' dance-school-cms/src/app/page.tsx
sed -i '' 's/valentine-card/modern-card/g' dance-school-cms/src/app/page.tsx
sed -i '' 's/valentine-glass/glass-card/g' dance-school-cms/src/app/page.tsx
sed -i '' 's/gradient-valentine-soft/gradient-pink-orange/g' dance-school-cms/src/app/page.tsx
sed -i '' 's/gradient-valentine-romantic/gradient-blue-purple/g' dance-school-cms/src/app/page.tsx
sed -i '' 's/gradient-valentine/gradient-purple-blue/g' dance-school-cms/src/app/page.tsx
sed -i '' 's/ valentine-shimmer//g' dance-school-cms/src/app/page.tsx

echo "Valentine's theme removed! Don't forget to:"
echo "1. Remove Valentine's CSS from globals.css"
echo "2. Test the site to ensure everything looks good"
echo "3. Commit and deploy the changes"
```

Save this as `remove-valentines.sh` and run:
```bash
chmod +x remove-valentines.sh
./remove-valentines.sh
```

## What Was Changed

### Components Added:
1. **ValentinesBanner.tsx** - Dismissible banner with Valentine's message
2. **FloatingHearts.tsx** - Animated floating hearts background

### Styling Added:
- Valentine's gradient variations (pink/red romantic colors)
- Heart pulse and beat animations
- Valentine's card styles with pink borders
- Valentine's glass effects
- Shimmer and sparkle effects
- Rose petal falling animation

### Pages Modified:
1. **layout.tsx** - Added Valentine's banner globally
2. **page.tsx** - Added floating hearts and Valentine's accents throughout

## Testing After Removal

After removing the Valentine's theme:

1. **Visual Check:**
   - Homepage should show original purple/blue gradients
   - No floating hearts in background
   - No Valentine's banner at top
   - Cards should have original styling

2. **Functionality Check:**
   - All links still work
   - Animations still smooth
   - No console errors
   - Mobile responsive still works

3. **Deploy:**
   ```bash
   git add .
   git commit -m "Remove Valentine's Day seasonal theme"
   git push origin main
   ```

## Notes

- The Valentine's theme was designed to be subtle and non-intrusive
- All changes are clearly marked with `VALENTINE'S` comments
- Original functionality remains unchanged
- Easy to re-apply next year if desired

## Questions?

If you encounter any issues during removal, check:
1. All Valentine's comments have been removed
2. No broken imports
3. CSS classes are reverted to originals
4. No orphaned Valentine's CSS in globals.css
