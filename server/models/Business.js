const { pool } = require("../config/database");

class Business {
    // get business by id
    static async getById(id) {
        const query = "SELECT * FROM businesses WHERE id = $1";
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }

    // get business by email
    static async getByEmail(email) {
        const query = "SELECT * FROM businesses WHERE email = $1";
        const result = await pool.query(query, [email]);
        return result.rows[0];
    }

    // get all businesses
    static async getAll() {
        const query = "SELECT * FROM businesses ORDER BY created_at DESC";
        const result = await pool.query(query);
        return result.rows;
    }

    // create new business
    static async create(businessData) {
        const { business_name, owner_name, email, phone, service_types } =
            businessData;

        const query = `
            INSERT INTO businesses (business_name, owner_name, email, phone, service_types)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [
            business_name,
            owner_name,
            email,
            phone,
            JSON.stringify(service_types || []),
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // update business
    static async update(id, businessData) {
        const { business_name, owner_name, email, phone, service_types } =
            businessData;

        const query = `
            UPDATE businesses
            SET business_name = $1, owner_name = $2, email = $3, phone = $4, service_types = $5
            WHERE id = $6
            RETURNING *
        `;

        const values = [
            business_name,
            owner_name,
            email,
            phone,
            JSON.stringify(service_types),
            id,
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    }

    // get business service types
    static async getServiceTypes(businessId) {
        const query = "SELECT service_types FROM businesses WHERE id = $1";
        const result = await pool.query(query, [businessId]);
        return result.rows[0]?.service_types || [];
    }

    // update service types
    static async updateServiceTypes(businessId, serviceTypes) {
        const query = `
            UPDATE businesses
            SET service_types = $1
            WHERE id = $2
            RETURNING service_types
        `;

        const result = await pool.query(query, [
            JSON.stringify(serviceTypes),
            businessId,
        ]);
        return result.rows[0]?.service_types || [];
    }

    // delete business
    static async delete(id) {
        const query = "DELETE FROM businesses WHERE id = $1 RETURNING *";
        const result = await pool.query(query, [id]);
        return result.rows[0];
    }
}

module.exports = Business;
