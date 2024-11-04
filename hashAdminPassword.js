const mysql = require('mysql');
const bcrypt = require('bcrypt');

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

const hashAdminPassword = async () => {
    const plainTextPassword = 'Ana'; // Replace with your actual plain text password
    try {
        const hashedPassword = await bcrypt.hash(plainTextPassword, 10);
        const sql = "UPDATE Uporabniki SET geslo = ? WHERE email = ''"; // Replace with your actual admin email
        db.query(sql, [hashedPassword], (err, result) => {
            if (err) {
                console.error('Database update error:', err);
                return;
            }
            console.log('Admin password successfully updated to hashed password');
        });
    } catch (err) {
        console.error('Error hashing password:', err);
    } finally {
        db.end();
    }
};

hashAdminPassword();
