import { type SchemaTypeDefinition } from 'sanity'
import { classType } from './classType'
import { instructorType } from './instructorType'
import { bookingType } from './bookingType'
import { userType } from './userType'
import { blockContentType } from './blockContentType'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Core types
    blockContentType,
    
    // Dance school types
    classType,
    instructorType,
    bookingType,
    userType,
  ],
}
