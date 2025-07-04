import { NextRequest, NextResponse } from 'next/server';
import { client } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const deletedCounts: Record<string, number> = {};

    // Delete all document types that might have references
    const documentTypes = [
      'booking',
      'pass', 
      'payment',
      'event',
      'post',
      'class',
      'instructor',
      'user',
      'tenant'
    ];

    for (const docType of documentTypes) {
      const docs = await client.fetch(`*[_type == "${docType}"]._id`);
      console.log(`Found ${docs.length} ${docType} documents to delete`);
      deletedCounts[docType] = docs.length;

      for (const id of docs) {
        try {
          await client.delete(id);
          console.log(`Deleted ${docType} ${id}`);
        } catch (deleteError) {
          console.log(`Failed to delete ${docType} ${id}:`, deleteError);
          // Continue with other documents
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cleared all documents`,
      deletedCounts
    });

  } catch (error) {
    console.error('Error clearing tenants:', error);
    return NextResponse.json(
      { error: 'Failed to clear tenants', details: error },
      { status: 500 }
    );
  }
}
