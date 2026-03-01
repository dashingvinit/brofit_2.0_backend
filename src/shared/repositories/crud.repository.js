class CrudRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    try {
      const record = await this.model.create({ data });
      return record;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async get(id, options = {}) {
    try {
      const record = await this.model.findUnique({
        where: { id },
        ...options,
      });
      return record;
    } catch (error) {
      throw error;
    }
  }

  async getAll(options = {}) {
    try {
      const {
        take,
        skip = 0,
        orderBy = { created_at: "desc" },
        ...rest
      } = options;

      const records = await this.model.findMany({
        take,
        skip,
        orderBy,
        ...rest,
      });

      return records;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async update(id, data) {
    try {
      if (Object.keys(data).length === 0) {
        return null;
      }

      const record = await this.model.update({
        where: { id },
        data,
      });

      return record;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async destroy(id) {
    try {
      const record = await this.model.update({
        where: { id },
        data: { isActive: false },
      });

      return record;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async hardDelete(id) {
    try {
      await this.model.delete({ where: { id } });
      return true;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async find(where = {}, options = {}) {
    try {
      const {
        take,
        skip = 0,
        orderBy = { created_at: "desc" },
        ...rest
      } = options;

      const records = await this.model.findMany({
        where,
        take,
        skip,
        orderBy,
        ...rest,
      });

      return records;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async findOne(where, options = {}) {
    try {
      const record = await this.model.findFirst({
        where,
        ...options,
      });
      return record;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async findWithPagination(where = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        orderBy = { created_at: "desc" },
        ...rest
      } = options;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        this.model.findMany({
          where,
          take: limit,
          skip,
          orderBy,
          ...rest,
        }),
        this.model.count({ where }),
      ]);

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
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async count(where = {}) {
    try {
      const count = await this.model.count({ where });
      return count;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async exists(where) {
    try {
      const record = await this.findOne(where);
      return !!record;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async updateMany(where, data) {
    try {
      if (Object.keys(data).length === 0 || Object.keys(where).length === 0) {
        return 0;
      }

      const result = await this.model.updateMany({
        where,
        data,
      });

      return result.count;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async deleteMany(where) {
    try {
      if (Object.keys(where).length === 0) {
        throw new Error("Filter required for deleteMany");
      }

      const result = await this.model.deleteMany({ where });
      return result.count;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async insertMany(dataArray) {
    try {
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return 0;
      }

      const result = await this.model.createMany({
        data: dataArray,
        skipDuplicates: true,
      });

      return result.count;
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }

  async rawQuery(queryFn) {
    try {
      return await queryFn(this.model);
    } catch (error) {
      console.log("Something went wrong in crud repo:", error.message);
      throw error;
    }
  }
}

module.exports = CrudRepository;
