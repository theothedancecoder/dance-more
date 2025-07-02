import { type SchemaTypeDefinition } from 'sanity'
import { classType } from './classType'
import { classInstanceType } from './classInstanceType'
import { instructorType } from './instructorType'
import { bookingType } from './bookingType'
import { userType } from './userType'
import { blockContentType } from './blockContentType'
import { subscriptionType } from './subscriptionType'
import { passType } from './passType'
import tenantType from './tenantType'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Core types
    blockContentType,
    
    // Multi-tenant types
    tenantType,
    
    // Dance school types
    classType,
    classInstanceType,
    instructorType,
    bookingType,
    userType,
    subscriptionType,
    passType,
  ],
}
