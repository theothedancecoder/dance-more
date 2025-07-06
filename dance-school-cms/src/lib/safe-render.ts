/**
 * Utility functions to safely render values in React components
 * to prevent "Objects are not valid as a React child" errors
 */

export function safeRenderString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  if (typeof value === 'object') {
    // If it's an object, try to extract common string properties
    if (value.name && typeof value.name === 'string') {
      return value.name;
    }
    if (value.title && typeof value.title === 'string') {
      return value.title;
    }
    if (value.email && typeof value.email === 'string') {
      return value.email;
    }
    // If no string property found, return empty string to avoid rendering object
    return '';
  }
  
  return String(value);
}

export function safeRenderEmail(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'object' && value.email && typeof value.email === 'string') {
    return value.email;
  }
  
  return '';
}

export function safeRenderName(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'object') {
    // Try different name properties
    if (value.name && typeof value.name === 'string') {
      return value.name;
    }
    if (value.firstName && value.lastName && 
        typeof value.firstName === 'string' && typeof value.lastName === 'string') {
      return `${value.firstName} ${value.lastName}`;
    }
    if (value.firstName && typeof value.firstName === 'string') {
      return value.firstName;
    }
    if (value.title && typeof value.title === 'string') {
      return value.title;
    }
  }
  
  return '';
}

export function safeRenderUser(user: any): { name: string; email: string } {
  return {
    name: safeRenderName(user),
    email: safeRenderEmail(user)
  };
}
