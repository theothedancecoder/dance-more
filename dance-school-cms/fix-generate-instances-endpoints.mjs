import fs from 'fs';
import path from 'path';

const filePath = 'src/app/[slug]/admin/schedule/page.tsx';

console.log('🔧 Fixing generate instances endpoints...');

try {
  // Read the current file
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the debug endpoint calls with production endpoints
  let updatedContent = content
    // Fix individual class generation
    .replace(
      /const response = await fetch\('\/api\/debug\/generate-instances', {[\s\S]*?}\);/g,
      `const response = await fetch('/api/admin/classes/generate-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          classId,
        }),
      });`
    )
    // Fix the success message for individual class
    .replace(
      /alert\(`Success! Generated \${result\.totalInstancesCreated} instances for \${result\.totalClassesProcessed} class\(es\)\.\`\);/g,
      `alert(\`Success! Generated \${result.instancesCreated} instances for this class.\`);`
    );

  // Now handle the generateAllInstances function separately
  const generateAllInstancesRegex = /const generateAllInstances = async \(\) => \{[\s\S]*?const response = await fetch\('\/api\/debug\/generate-instances'[\s\S]*?\}\);[\s\S]*?\}\;/;
  
  const newGenerateAllInstances = `const generateAllInstances = async () => {
    try {
      const response = await fetch('/api/admin/generate-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate instances');
      }

      const result = await response.json();
      alert(\`Success! Generated \${result.totalInstancesCreated} instances for \${result.classesProcessed} class(es).\`);
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      alert('Error generating instances: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };`;

  updatedContent = updatedContent.replace(generateAllInstancesRegex, newGenerateAllInstances);

  // Write the updated content back to the file
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  
  console.log('✅ Successfully updated generate instances endpoints!');
  console.log('📝 Changes made:');
  console.log('   - Individual class generation now uses /api/admin/classes/generate-instances');
  console.log('   - Bulk generation now uses /api/admin/generate-instances');
  console.log('   - Added proper tenant headers');
  console.log('   - Fixed success message formatting');
  
} catch (error) {
  console.error('❌ Error updating file:', error);
}
