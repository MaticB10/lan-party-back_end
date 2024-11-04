const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(bodyParser.json()); // Parse JSON bodies

// Database connection setup
const db = mysql.createConnection({
    host: "78.47.245.88",
    user: 'matic',
    password: 'geslo123',
    database: 'lan-party-test'
});

db.connect(err => {
    if (err) {
        console.error('Error connecting to the database:', err.stack);
        return;
    }
    console.log('Connected to the database');
});

const JWT_SECRET = '1e3522035699e5d8e5fc73a2a5774b86e6fa2ab7500de3dc32f0f0d8d2d77c1c';

// Basic endpoint to verify backend is running
app.get('/', (req, res) => {
    return res.json("From Backend Side");
});

// Endpoint to fetch all users
app.get('/students', (req, res) => {
    const sql = "SELECT * FROM students";
    db.query(sql, (err, data) => {
        if (err) {
            console.error('Database query error:', err);
            return res.json(err);
        }
        return res.json(data);
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    console.log('Login attempt with email:', email, 'and geslo:', password);

    const sql = "SELECT * FROM students WHERE email = ?";

    db.query(sql, [email], async (err, data) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ error: true, data: 'Internal server error' });
        }
        if (data.length === 0) {
            console.log('Invalid credentials');
            return res.status(401).json({ error: true, data: 'Invalid credentials' });
        }

        const user = data[0];
        console.log('Retrieved user:', user);

        // Ensure geslo and user.geslo are defined
        if (!password || !students.password) {
            console.error('Password or hash not defined');
            return res.status(500).json({ error: true, data: 'Internal server error' });
        }

        const match = await bcrypt.compare(password, students.password);
        if (!match) {
            console.log('Invalid credentials');
            return res.status(401).json({ error: true, data: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: students.id, email: students.email},
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        return res.json({ error: false, data: user, token });
    });
});

// Endpoint to change password
app.post('/change-password', async (req, res) => {
    const { email, password } = req.body;
    console.log('Password change attempt for email:', email);

    if (!email || !password) {
        console.error('Missing email or password');
        return res.status(400).json({ error: true, message: 'Email and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = "UPDATE students SET password = ? WHERE email = ?";
        db.query(sql, [hashedPassword, email], (err, result) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ error: true, message: 'Internal server error' });
            }
            if (result.affectedRows === 0) {
                console.log('No user found with email:', email);
                return res.status(404).json({ error: true, message: 'User not found' });
            }
            console.log('Password successfully updated for email:', email);
            return res.json({ error: false, message: 'Password successfully updated' });
        });
    } catch (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ error: true, message: 'Error updating password' });
    }
});

// Start the server
app.listen(8081, () => {
    console.log("Listening on port 8081");
});
