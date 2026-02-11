/**
 * Base CRUD Repository for MongoDB with Mongoose
 * Provides common database operations for all repositories
 * Each feature repository extends this class and passes a Mongoose model
 */
class CrudRepository {
  /**
   * @param {mongoose.Model} model - Mongoose model for the collection
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * Transform MongoDB document to clean object with id instead of _id
   * @param {Object} doc - Document to transform
   * @returns {Object} Transformed document
   */
  _transformDocument(doc) {
    if (!doc) return doc;

    if (Array.isArray(doc)) {
      return doc.map(d => this._transformDocument(d));
    }

    const transformed = { ...doc };
    if (transformed._id) {
      transformed.id = transformed._id.toString();
      delete transformed._id;
    }
    if (transformed.__v !== undefined) {
      delete transformed.__v;
    }
    // Transform ObjectId fields to strings
    Object.keys(transformed).forEach(key => {
      if (transformed[key] && typeof transformed[key] === 'object' && transformed[key].constructor.name === 'ObjectId') {
        transformed[key] = transformed[key].toString();
      }
    });
    return transformed;
  }

  /**
   * Create a new document
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} Created document
   */
  async create(data) {
    try {
      const document = await this.model.create(data);
      return this._transformDocument(document.toObject());
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Find document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Document or null
   */
  async get(id) {
    try {
      const document = await this.model.findById(id).lean();
      return this._transformDocument(document);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all documents
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>} Array of documents
   */
  async getAll(options = {}) {
    try {
      const { limit, offset = 0, orderBy = '-createdAt' } = options;

      let query = this.model.find();

      if (orderBy) {
        query = query.sort(orderBy);
      }

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.skip(offset);
      }

      const documents = await query.lean();
      return this._transformDocument(documents);
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Update document by ID
   * @param {string} id - Document ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object|null>} Updated document or null
   */
  async update(id, data) {
    try {
      if (Object.keys(data).length === 0) {
        return null;
      }

      const document = await this.model.findByIdAndUpdate(
        id,
        { ...data, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).lean();

      return this._transformDocument(document);
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Soft delete (set isActive = false)
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Deleted document or null
   */
  async destroy(id) {
    try {
      const document = await this.model.findByIdAndUpdate(
        id,
        { isActive: false, updatedAt: new Date() },
        { new: true }
      ).lean();

      return document;
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Hard delete (permanent deletion)
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} Success status
   */
  async hardDelete(id) {
    try {
      const result = await this.model.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Find documents with filter
   * @param {Object} filter - Filter conditions
   * @param {Object} options - Query options (limit, offset, orderBy)
   * @returns {Promise<Array>} Array of documents
   */
  async find(filter = {}, options = {}) {
    try {
      const { limit, offset = 0, orderBy = '-createdAt' } = options;

      let query = this.model.find(filter);

      if (orderBy) {
        query = query.sort(orderBy);
      }

      if (limit) {
        query = query.limit(limit);
      }

      if (offset) {
        query = query.skip(offset);
      }

      const documents = await query.lean();
      return this._transformDocument(documents);
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Find one document with filter
   * @param {Object} filter - Filter conditions
   * @returns {Promise<Object|null>} Document or null
   */
  async findOne(filter) {
    try {
      const document = await this.model.findOne(filter).lean();
      return this._transformDocument(document);
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Find documents with pagination
   * @param {Object} filter - Filter conditions
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Paginated results
   */
  async findWithPagination(filter = {}, options = {}) {
    try {
      const { page = 1, limit = 10, orderBy = '-createdAt' } = options;
      const offset = (page - 1) * limit;

      const data = await this.find(filter, { limit, offset, orderBy });
      const total = await this.count(filter);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Count documents
   * @param {Object} filter - Filter conditions
   * @returns {Promise<number>} Count
   */
  async count(filter = {}) {
    try {
      const count = await this.model.countDocuments(filter);
      return count;
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Check if document exists
   * @param {Object} filter - Filter conditions
   * @returns {Promise<boolean>} Exists status
   */
  async exists(filter) {
    try {
      const document = await this.findOne(filter);
      return !!document;
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Update multiple documents
   * @param {Object} filter - Filter conditions
   * @param {Object} data - Data to update
   * @returns {Promise<number>} Number of updated documents
   */
  async updateMany(filter, data) {
    try {
      if (Object.keys(data).length === 0 || Object.keys(filter).length === 0) {
        return 0;
      }

      const result = await this.model.updateMany(
        filter,
        { ...data, updatedAt: new Date() }
      );

      return result.modifiedCount;
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Delete multiple documents
   * @param {Object} filter - Filter conditions
   * @returns {Promise<number>} Number of deleted documents
   */
  async deleteMany(filter) {
    try {
      if (Object.keys(filter).length === 0) {
        throw new Error("Filter required for deleteMany");
      }

      const result = await this.model.deleteMany(filter);
      return result.deletedCount;
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Insert multiple documents
   * @param {Array<Object>} dataArray - Array of data to insert
   * @returns {Promise<Array>} Array of created documents
   */
  async insertMany(dataArray) {
    try {
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return [];
      }

      const documents = await this.model.insertMany(dataArray);
      return documents.map(doc => doc.toObject());
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }

  /**
   * Execute raw query using Mongoose methods
   * @param {Function} queryFn - Function that takes the model and returns a query
   * @returns {Promise<any>} Query result
   */
  async rawQuery(queryFn) {
    try {
      return await queryFn(this.model);
    } catch (error) {
      console.log("Something went wrong in crud repo");
      throw error;
    }
  }
}

module.exports = CrudRepository;
