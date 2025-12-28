import { Firestore } from '@google-cloud/firestore';

let db = null;

/**
 * Database wrapper that provides a similar API to SQL databases
 * but uses Firestore (NoSQL) underneath
 */
class DatabaseWrapper {
  constructor(firestore) {
    this.db = firestore;
  }

  /**
   * Get a collection reference
   */
  collection(name) {
    return this.db.collection(name);
  }

  /**
   * Query and return all documents from a collection
   */
  async queryAll(collectionName, orderBy = null, orderDirection = 'asc') {
    let query = this.db.collection(collectionName);

    if (orderBy) {
      query = query.orderBy(orderBy, orderDirection);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Query and return first document matching conditions
   */
  async queryOne(collectionName, field = null, value = null) {
    if (field && value !== null) {
      const snapshot = await this.db.collection(collectionName)
        .where(field, '==', value)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } else {
      // Get first document
      const snapshot = await this.db.collection(collectionName).limit(1).get();
      if (snapshot.empty) {
        return null;
      }
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  }

  /**
   * Get a document by ID
   */
  async getById(collectionName, id) {
    const doc = await this.db.collection(collectionName).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Get all documents matching a condition
   */
  async queryWhere(collectionName, field, operator, value) {
    const snapshot = await this.db.collection(collectionName)
      .where(field, operator, value)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Create or update a document
   */
  async set(collectionName, id, data) {
    const docRef = this.db.collection(collectionName).doc(id);
    await docRef.set(data, { merge: true });
    return { id, ...data };
  }

  /**
   * Delete a document
   */
  async delete(collectionName, id) {
    await this.db.collection(collectionName).doc(id).delete();
  }

  /**
   * Delete all documents matching a condition
   */
  async deleteWhere(collectionName, field, operator, value) {
    const snapshot = await this.db.collection(collectionName)
      .where(field, operator, value)
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  /**
   * Close database connection (Firestore doesn't need explicit closing, but we provide it for compatibility)
   */
  async close() {
    // Firestore client doesn't need explicit closing
    // But we can clean up if needed
    db = null;
  }
}

export async function initDatabase() {
  try {
    // Initialize Firestore
    // In production (Cloud Run), credentials are automatically provided via Application Default Credentials
    // In development, you can use GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service account key
    db = new Firestore({
      projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
      // If running locally and you have a service account key file:
      // keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    const dbWrapper = new DatabaseWrapper(db);

    console.log(`✅ Database connected to Firestore (project: ${process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'default'})`);

    // Initialize password from environment variable if it doesn't exist
    const passwordCheck = await dbWrapper.getById('settings', 'password');
    if (!passwordCheck) {
      const initialPassword = process.env.ADMIN_PASSWORD || process.env.INITIAL_ADMIN_PASSWORD;
      if (initialPassword) {
        await dbWrapper.set('settings', 'password', { value: initialPassword });
        console.log('Initial admin password set from environment variable');
      } else {
        console.warn('⚠️  WARNING: No admin password set! Set ADMIN_PASSWORD environment variable or set it via admin panel.');
      }
    }

    return dbWrapper;
  } catch (error) {
    console.error('❌ Failed to initialize Firestore:', error.message);
    if (error.code === 7 || error.message.includes('PERMISSION_DENIED')) {
      console.error('   Check that your service account has Firestore permissions');
      console.error('   In Cloud Run, ensure the service account has roles/datastore.user');
      console.error('   For local development, set GOOGLE_APPLICATION_CREDENTIALS to your service account key file');
    } else if (error.message.includes('project')) {
      console.error('   Set GCP_PROJECT_ID or GOOGLE_CLOUD_PROJECT environment variable');
    }
    throw error;
  }
}

export async function closeDatabase() {
  if (db) {
    try {
      // Firestore doesn't need explicit closing, but we can clean up
      db = null;
      console.log('✅ Firestore connection closed.');
    } catch (error) {
      console.error('Error closing Firestore connection:', error);
    }
  }
}
