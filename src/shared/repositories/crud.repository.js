class CrudRepository {
  constructor(model) {
    this.model = model;
  }

  async create(data) {
    return await this.model.create({ data });
  }

  async get(id, options = {}) {
    return await this.model.findUnique({ where: { id }, ...options });
  }

  async getAll(options = {}) {
    const { take, skip = 0, orderBy = { created_at: "desc" }, ...rest } = options;
    return await this.model.findMany({ take, skip, orderBy, ...rest });
  }

  async update(id, data) {
    if (Object.keys(data).length === 0) return null;
    return await this.model.update({ where: { id }, data });
  }

  async destroy(id) {
    return await this.model.update({ where: { id }, data: { isActive: false } });
  }

  async hardDelete(id) {
    await this.model.delete({ where: { id } });
    return true;
  }

  async find(where = {}, options = {}) {
    const { take, skip = 0, orderBy = { created_at: "desc" }, ...rest } = options;
    return await this.model.findMany({ where, take, skip, orderBy, ...rest });
  }

  async findOne(where, options = {}) {
    return await this.model.findFirst({ where, ...options });
  }

  async findWithPagination(where = {}, options = {}) {
    const { page = 1, limit = 10, orderBy = { created_at: "desc" }, ...rest } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({ where, take: limit, skip, orderBy, ...rest }),
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
  }

  async count(where = {}) {
    return await this.model.count({ where });
  }

  async exists(where) {
    return !!(await this.findOne(where));
  }

  async updateMany(where, data) {
    if (Object.keys(data).length === 0 || Object.keys(where).length === 0) return 0;
    const result = await this.model.updateMany({ where, data });
    return result.count;
  }

  async deleteMany(where) {
    if (Object.keys(where).length === 0) {
      throw new Error("Filter required for deleteMany");
    }
    const result = await this.model.deleteMany({ where });
    return result.count;
  }

  async insertMany(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) return 0;
    const result = await this.model.createMany({ data: dataArray, skipDuplicates: true });
    return result.count;
  }

  async rawQuery(queryFn) {
    return await queryFn(this.model);
  }
}

module.exports = CrudRepository;
