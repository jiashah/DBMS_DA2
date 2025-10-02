const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'your_password', // Change this
  database: 'testdb', // Change this
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
pool.getConnection()
  .then(conn => {
    console.log('Database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

// CREATE TABLE
app.post('/api/table/create', async (req, res) => {
  try {
    const { tableName, columns } = req.body;
    
    if (!tableName || !columns || columns.length === 0) {
      return res.status(400).json({ error: 'Table name and columns are required' });
    }

    const columnDefs = columns.map(col => {
      let def = `${col.name} ${col.type}`;
      if (col.length) def += `(${col.length})`;
      if (col.notNull) def += ' NOT NULL';
      if (col.autoIncrement) def += ' AUTO_INCREMENT';
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (col.unique) def += ' UNIQUE';
      if (col.default) def += ` DEFAULT ${col.default}`;
      return def;
    }).join(', ');

    const query = `CREATE TABLE ${tableName} (${columnDefs})`;
    await pool.execute(query);
    
    res.json({ success: true, message: `Table ${tableName} created successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALTER TABLE - ADD COLUMN
app.post('/api/table/alter/add-column', async (req, res) => {
  try {
    const { tableName, column } = req.body;
    
    let columnDef = `${column.name} ${column.type}`;
    if (column.length) columnDef += `(${column.length})`;
    if (column.notNull) columnDef += ' NOT NULL';
    if (column.default) columnDef += ` DEFAULT ${column.default}`;

    const query = `ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`;
    await pool.execute(query);
    
    res.json({ success: true, message: `Column ${column.name} added successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALTER TABLE - DROP COLUMN
app.post('/api/table/alter/drop-column', async (req, res) => {
  try {
    const { tableName, columnName } = req.body;
    
    const query = `ALTER TABLE ${tableName} DROP COLUMN ${columnName}`;
    await pool.execute(query);
    
    res.json({ success: true, message: `Column ${columnName} dropped successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ALTER TABLE - MODIFY COLUMN
app.post('/api/table/alter/modify-column', async (req, res) => {
  try {
    const { tableName, column } = req.body;
    
    let columnDef = `${column.name} ${column.type}`;
    if (column.length) columnDef += `(${column.length})`;
    if (column.notNull) columnDef += ' NOT NULL';
    if (column.default) columnDef += ` DEFAULT ${column.default}`;

    const query = `ALTER TABLE ${tableName} MODIFY COLUMN ${columnDef}`;
    await pool.execute(query);
    
    res.json({ success: true, message: `Column ${column.name} modified successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DROP TABLE
app.delete('/api/table/drop/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const query = `DROP TABLE ${tableName}`;
    await pool.execute(query);
    
    res.json({ success: true, message: `Table ${tableName} dropped successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// INSERT DATA
app.post('/api/data/insert', async (req, res) => {
  try {
    const { tableName, data } = req.body;
    
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
    const [result] = await pool.execute(query, values);
    
    res.json({ success: true, message: 'Data inserted successfully', insertId: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE DATA
app.put('/api/data/update', async (req, res) => {
  try {
    const { tableName, data, where } = req.body;
    
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const setValues = Object.values(data);
    
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const whereValues = Object.values(where);

    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
    const [result] = await pool.execute(query, [...setValues, ...whereValues]);
    
    res.json({ success: true, message: 'Data updated successfully', affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE DATA
app.delete('/api/data/delete', async (req, res) => {
  try {
    const { tableName, where } = req.body;
    
    const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
    const whereValues = Object.values(where);

    const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    const [result] = await pool.execute(query, whereValues);
    
    res.json({ success: true, message: 'Data deleted successfully', affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SELECT DATA
app.get('/api/data/select/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const query = `SELECT * FROM ${tableName}`;
    const [rows] = await pool.execute(query);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD CONSTRAINT - PRIMARY KEY
app.post('/api/constraint/add/primary-key', async (req, res) => {
  try {
    const { tableName, columnName, constraintName } = req.body;
    
    const query = `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} PRIMARY KEY (${columnName})`;
    await pool.execute(query);
    
    res.json({ success: true, message: 'Primary key constraint added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD CONSTRAINT - FOREIGN KEY
app.post('/api/constraint/add/foreign-key', async (req, res) => {
  try {
    const { tableName, columnName, refTable, refColumn, constraintName } = req.body;
    
    const query = `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} 
                   FOREIGN KEY (${columnName}) REFERENCES ${refTable}(${refColumn})`;
    await pool.execute(query);
    
    res.json({ success: true, message: 'Foreign key constraint added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD CONSTRAINT - UNIQUE
app.post('/api/constraint/add/unique', async (req, res) => {
  try {
    const { tableName, columnName, constraintName } = req.body;
    
    const query = `ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} UNIQUE (${columnName})`;
    await pool.execute(query);
    
    res.json({ success: true, message: 'Unique constraint added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DROP CONSTRAINT
app.delete('/api/constraint/drop', async (req, res) => {
  try {
    const { tableName, constraintName, constraintType } = req.body;
    
    let query;
    if (constraintType === 'PRIMARY KEY') {
      query = `ALTER TABLE ${tableName} DROP PRIMARY KEY`;
    } else if (constraintType === 'FOREIGN KEY') {
      query = `ALTER TABLE ${tableName} DROP FOREIGN KEY ${constraintName}`;
    } else {
      query = `ALTER TABLE ${tableName} DROP INDEX ${constraintName}`;
    }
    
    await pool.execute(query);
    
    res.json({ success: true, message: 'Constraint dropped successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET ALL TABLES
app.get('/api/tables', async (req, res) => {
  try {
    const [rows] = await pool.execute('SHOW TABLES');
    const tables = rows.map(row => Object.values(row)[0]);
    
    res.json({ success: true, tables });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET TABLE STRUCTURE
app.get('/api/table/structure/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const [rows] = await pool.execute(`DESCRIBE ${tableName}`);
    
    res.json({ success: true, structure: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});