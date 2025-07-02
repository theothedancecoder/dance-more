import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Class,
  Pass,
  Subscription,
  Booking,
  Payment,
  ChatMessage,
  UserRole,
} from '../types';

// In-memory storage (will be replaced with proper database in production)
const storage = {
  users: new Map<string, User>(),
  classes: new Map<string, Class>(),
  passes: new Map<string, Pass>(),
  subscriptions: new Map<string, Subscription>(),
  bookings: new Map<string, Booking>(),
  payments: new Map<string, Payment>(),
  chatMessages: new Map<string, ChatMessage>(),
};

// Generic CRUD operations
const createRecord = <T extends { id: string; createdAt: Date; updatedAt: Date }>(
  collection: Map<string, T>,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): T => {
  const now = new Date();
  const id = uuidv4();
  const record = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  } as T;
  
  collection.set(id, record);
  return record;
};

const getRecord = <T>(collection: Map<string, T>, id: string): T | null => {
  return collection.get(id) || null;
};

const updateRecord = <T extends { updatedAt: Date }>(
  collection: Map<string, T>,
  id: string,
  data: Partial<T>
): T | null => {
  const record = collection.get(id);
  if (!record) return null;

  const updated = {
    ...record,
    ...data,
    updatedAt: new Date(),
  };
  
  collection.set(id, updated);
  return updated;
};

const deleteRecord = <T>(collection: Map<string, T>, id: string): boolean => {
  return collection.delete(id);
};

const listRecords = <T>(collection: Map<string, T>): T[] => {
  return Array.from(collection.values());
};

// Export database operations
export const db = {
  // User operations
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) =>
    createRecord(storage.users, data),
  getUser: (id: string) => getRecord(storage.users, id),
  getUserByEmail: (email: string) => 
    listRecords(storage.users).find(user => user.email === email) || null,
  updateUser: (id: string, data: Partial<User>) => updateRecord(storage.users, id, data),
  deleteUser: (id: string) => deleteRecord(storage.users, id),
  listUsers: () => listRecords(storage.users),

  // Class operations
  createClass: (data: Omit<Class, 'id' | 'createdAt' | 'updatedAt'>) =>
    createRecord(storage.classes, data),
  getClass: (id: string) => getRecord(storage.classes, id),
  updateClass: (id: string, data: Partial<Class>) => updateRecord(storage.classes, id, data),
  deleteClass: (id: string) => deleteRecord(storage.classes, id),
  listClasses: () => listRecords(storage.classes),

  // Pass operations
  createPass: (data: Omit<Pass, 'id' | 'createdAt' | 'updatedAt'>) =>
    createRecord(storage.passes, data),
  getPass: (id: string) => getRecord(storage.passes, id),
  updatePass: (id: string, data: Partial<Pass>) => updateRecord(storage.passes, id, data),
  deletePass: (id: string) => deleteRecord(storage.passes, id),
  listPasses: () => listRecords(storage.passes),

  // Subscription operations
  createSubscription: (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) =>
    createRecord(storage.subscriptions, data),
  getSubscription: (id: string) => getRecord(storage.subscriptions, id),
  updateSubscription: (id: string, data: Partial<Subscription>) => 
    updateRecord(storage.subscriptions, id, data),
  deleteSubscription: (id: string) => deleteRecord(storage.subscriptions, id),
  listSubscriptions: () => listRecords(storage.subscriptions),
  getUserSubscriptions: (userId: string) =>
    listRecords(storage.subscriptions).filter(sub => sub.userId === userId),

  // Booking operations
  createBooking: (data: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) =>
    createRecord(storage.bookings, data),
  getBooking: (id: string) => getRecord(storage.bookings, id),
  updateBooking: (id: string, data: Partial<Booking>) => updateRecord(storage.bookings, id, data),
  deleteBooking: (id: string) => deleteRecord(storage.bookings, id),
  listBookings: () => listRecords(storage.bookings),
  getUserBookings: (userId: string) =>
    listRecords(storage.bookings).filter(booking => booking.userId === userId),
  getClassBookings: (classId: string) =>
    listRecords(storage.bookings).filter(booking => booking.classId === classId),

  // Payment operations
  createPayment: (data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) =>
    createRecord(storage.payments, data),
  getPayment: (id: string) => getRecord(storage.payments, id),
  updatePayment: (id: string, data: Partial<Payment>) => updateRecord(storage.payments, id, data),
  deletePayment: (id: string) => deleteRecord(storage.payments, id),
  listPayments: () => listRecords(storage.payments),
  getUserPayments: (userId: string) =>
    listRecords(storage.payments).filter(payment => payment.userId === userId),

  // Chat operations
  createChatMessage: (data: Omit<ChatMessage, 'id' | 'createdAt'>) => {
    const id = uuidv4();
    const message = {
      ...data,
      id,
      createdAt: new Date(),
    };
    storage.chatMessages.set(id, message);
    return message;
  },
  getChatMessage: (id: string) => getRecord(storage.chatMessages, id),
  deleteChatMessage: (id: string) => deleteRecord(storage.chatMessages, id),
  getClassChatMessages: (classId: string) =>
    listRecords(storage.chatMessages)
      .filter(message => message.classId === classId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
};

// Initialize with sample data
export const initializeSampleData = () => {
  // Check if admin already exists to avoid duplicates
  const existingAdmin = db.getUserByEmail('admin@danceschool.com');
  let admin;
  
  if (!existingAdmin) {
    admin = db.createUser({
      email: 'admin@danceschool.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
    });
  } else {
    admin = existingAdmin;
  }

  // Create sample instructor
  const instructor = db.createUser({
    email: 'instructor@danceschool.com',
    name: 'Jane Smith',
    role: UserRole.INSTRUCTOR,
  });

  // Create sample student
  const student = db.createUser({
    email: 'student@danceschool.com',
    name: 'John Doe',
    role: UserRole.STUDENT,
  });

  // Create sample passes
  const singlePass = db.createPass({
    type: 'single',
    name: 'Single Class Pass',
    description: 'Access to one dance class',
    price: 25,
    validityDays: 30,
    classesLimit: 1,
  });

  const multiPass = db.createPass({
    type: 'multi',
    name: '10 Class Pass',
    description: 'Access to 10 dance classes',
    price: 200,
    validityDays: 90,
    classesLimit: 10,
  });

  const unlimitedPass = db.createPass({
    type: 'unlimited',
    name: 'Monthly Unlimited',
    description: 'Unlimited access for one month',
    price: 150,
    validityDays: 30,
    classesLimit: null,
  });

  // Create sample classes
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const class1 = db.createClass({
    title: 'Beginner Ballet',
    description: 'Perfect for those new to ballet',
    instructorId: instructor.id,
    capacity: 15,
    price: 25,
    startTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
    endTime: new Date(tomorrow.setHours(11, 0, 0, 0)),
    location: 'Studio A',
  });

  const class2 = db.createClass({
    title: 'Hip Hop Intermediate',
    description: 'High-energy hip hop for intermediate dancers',
    instructorId: instructor.id,
    capacity: 20,
    price: 30,
    startTime: new Date(tomorrow.setHours(14, 0, 0, 0)),
    endTime: new Date(tomorrow.setHours(15, 30, 0, 0)),
    location: 'Studio B',
  });

  console.log('Sample data initialized successfully!');
  return { admin, instructor, student, passes: [singlePass, multiPass, unlimitedPass], classes: [class1, class2] };
};
