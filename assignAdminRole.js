import sanityClient from '@sanity/client'

const client = sanityClient({
    projectId: 'a2qsy4v6',              // wrap in quotes
    dataset: 'production',              // wrap in quotes
    token: 
'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',  
// wrap in quotes
    useCdn: false                      // don't use CDN for writes
  })

async function createAdminRoleAndAssignUser() {
  try {
    // Step 1: Check if Admin role exists
    const existingAdmin = await client.fetch('*[_type == "role" && name == 
"Admin"][0]')
    let adminRoleId

    if (existingAdmin) {
      console.log('Admin role already exists:', existingAdmin._id)
      adminRoleId = existingAdmin._id
    } else {
      // Step 2: Create Admin role
      const adminRoleDoc = {
        _type: 'role',
        name: 'Admin',
        permissions: [
          "createClass",
          "viewReports",
          "createSchedules",
          "manageUsers",
          "manageTenantSettings"
          // add other permissions here
        ]
      }
      const createdRole = await client.create(adminRoleDoc)
      console.log('Created Admin role with ID:', createdRole._id)
      adminRoleId = createdRole._id
    }

    // Step 3: Find user by email
    const userEmail = 'theothecoder@gmail.com' // change to target email
    const user = await client.fetch('*[_type == "user" && email == $email][0]', { 
email: userEmail })

    if (!user) {
      console.error('User not found:', userEmail)
      return
    }
    console.log('Found user:', user._id)

    // Step 4: Find tenant by slug
    const tenantSlug = 'dancecity' // change to your tenant slug
    const tenant = await client.fetch('*[_type == "tenant" && slug.current == 
$slug][0]', { slug: tenantSlug })

    if (!tenant) {
      console.error('Tenant not found:', tenantSlug)
      return
    }
    console.log('Found tenant:', tenant._id)

    // Step 5: Check if userRole already exists for this user/tenant/role
    const existingUserRole = await client.fetch(`
      *[_type == "userRole" && user._ref == $userId && tenant._ref == $tenantId && 
role._ref == $roleId][0]
    `, {
      userId: user._id,
      tenantId: tenant._id,
      roleId: adminRoleId
    })

    if (existingUserRole) {
      console.log('userRole document already exists')
      return
    }

    // Step 6: Create userRole document linking user, role, tenant
    const userRoleDoc = {
      _type: 'userRole',
      user: { _type: 'reference', _ref: user._id },
      role: { _type: 'reference', _ref: adminRoleId },
      tenant: { _type: 'reference', _ref: tenant._id }
    }

    const createdUserRole = await client.create(userRoleDoc)
    console.log('Created userRole document:', createdUserRole._id)

  } catch (error) {
    console.error('Error:', error)
  }
}

createAdminRoleAndAssignUser()


