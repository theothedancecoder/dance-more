import { initializeSampleData } from './database';

export function initSampleData() {
  const data = initializeSampleData();
  console.log('Sample data initialized:', data);
  return data;
}
