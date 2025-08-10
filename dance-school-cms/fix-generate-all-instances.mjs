import fs from 'fs';

const filePath = 'src/app/[slug]/admin/schedule/page.tsx';

console.log('🔧 Fixing generateAllInstances function...');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix the generateAllInstances function
  const oldFunction = `  const generateAllInstances = async () => {
    try {
      const response = await fetch('/api/admin/classes/generate-instances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          classId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate instances');
      }

      const result = await response.json();
      alert(\`Success! Generated \${result.instancesCreated} instances for this class.\`);
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      alert('Error generating instances: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };`;

  const newFunction = `  const generateAllInstances = async () => {
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
      alert(\`Success! Generated \${result.totalInstancesCreated} instances for \${result.classesProcessed} classes.\`);
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      alert('Error generating instances: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };`;

  content = content.replace(oldFunction, newFunction);
  
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ Fixed generateAllInstances function!');
  console.log('📝 Changes:');
  console.log('   - Removed undefined classId reference');
  console.log('   - Changed endpoint to /api/admin/generate-instances (bulk)');
  console.log('   - Fixed success message to show totalInstancesCreated');
  
} catch (error) {
  console.error('❌ Error fixing function:', error);
}
