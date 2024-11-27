const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios'); // To send HTTP requests to the Discord webhook
require('dotenv').config(); // Uporabi dotenv za branje .env datoteke

const app = express();

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(bodyParser.json()); // Parse JSON bodies

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect((err) => {
    if (err) {
        console.error('Napaka pri povezavi z bazo:', err);
        return;
    }
    console.log('Uspešna povezava z bazo!');
});


const JWT_SECRET = '1e3522035699e5d8e5fc73a2a5774b86e6fa2ab7500de3dc32f0f0d8d2d77c1c';

// Basic endpoint to verify backend is running
app.get('/', (req, res) => {
    return res.json("From Backend Side");
});

// Konfiguracija poštnega strežnika
const transporter = nodemailer.createTransport({
    host: 'smtp.office365.com',
    port: 587,
    secure: false, // true za port 465, false za ostale porte
    auth: {
        user: 'lanparty@scv.si', // Vaš Outlook e-poštni naslov
        pass: 'SELECTscvstaff23!'              // Vaše geslo za Outlook račun
    },
    tls: {
        rejectUnauthorized: false // Dodatek, ki lahko pomaga pri težavah z overjanjem
    }
});

const discordWebhookUrl = 'https://discord.com/api/webhooks/1306203129733447740/cJS17l5HEZk6OTsT1vAFl0RZE3IkqCUn-tuWX_2ME5HgaLa0Vvi4laRMxUi-7BAlYr1H';


app.post('/register', async (req, res) => {
    const { username, surname, email, password } = req.body;

    if (!username || !surname || !email || !password) {
        return res.status(400).json({ error: true, message: 'Vsa polja so obvezna.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = "INSERT INTO students (username, surname, email, password, type) VALUES (?, ?, ?, ?, ?)";
        db.query(sql, [username, surname, email, hashedPassword, 'student'], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: true, message: 'Email že obstaja.' });
                }
                console.error('Napaka pri vstavljanju uporabnika:', err);
                return res.status(500).json({ error: true, message: 'Notranja napaka strežnika.' });
            }

            // Send a welcome email (code as per your previous setup)

            // Send a message to Discord webhook
            axios.post(discordWebhookUrl, {
                content: `🎉 Nova registracija: **${username} ${surname}** (Email: ${email}) se je registrelav! 🎉`
            })
            .then(() => {
                console.log('Discord notification sent successfully');
            })
            .catch(error => {
                console.error('Error sending Discord notification:', error);
            });

            return res.json({ error: false, message: 'Uspešna registracija in e-pošta poslana.' });
        });
    } catch (err) {
        console.error('Napaka pri hashiranju gesla:', err);
        return res.status(500).json({ error: true, message: 'Napaka pri registraciji uporabnika.' });
    }
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
    console.log('Login attempt with email:', email);

    const sql = "SELECT * FROM students WHERE email = ?";

    db.query(sql, [email], async (err, data) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ error: true, message: 'Internal server error' });
        }
        if (data.length === 0) {
            console.log('Nepravilen Mail');
            return res.status(401).json({ error: true, message: 'Nepravilen Mail' });
        }

        const user = data[0];
        console.log('Retrieved user:', user);

        try {
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                console.log('Nepravilo Geslo');
                return res.status(401).json({ error: true, message: 'Nepravilo Geslo' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            return res.json({
                error: false,
                token,
                data: {
                    username: user.username,
                    surname: user.surname
                }
            });
        } catch (error) {
            console.error('Error in password comparison or token generation:', error);
            return res.status(500).json({ error: true, message: 'Internal server error' });
        }
    });
});

// Endpoint za pridobivanje iger
app.get('/games', (req, res) => {
    const sql = "SELECT id, name FROM games WHERE tournament_type = 1";
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Napaka pri pridobivanju iger iz baze:', err);
            return res.status(500).json({ error: true, message: 'Napaka pri pridobivanju iger' });
        }
        return res.json(results);
    });
});

app.get('/teams', (req, res) => {
    const sql = "SELECT * FROM teams";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Napaka pri pridobivanju ekip iz baze:', err);
            return res.status(500).json({ error: true, message: 'Napaka pri pridobivanju ekip' });
        }
        return res.json(results); // Vrne rezultate kot JSON
    });
});

app.post('/teams', (req, res) => {
    const { name, tournament_id, students_id } = req.body;

    if (!name || !tournament_id || !students_id) {
        return res.status(400).json({ error: true, message: 'Vsa polja so obvezna.' });
    }

    const sql = "INSERT INTO teams (name, tournament_id, student_id) VALUES (?, ?, ?)";
    db.query(sql, [name, tournament_id, students_id], (err, result) => {
        if (err) {
            console.error('Napaka pri vstavljanju ekipe:', err);
            return res.status(500).json({ error: true, message: 'Napaka pri shranjevanju ekipe.' });
        }

        return res.json({ error: false, message: 'Ekipa uspešno prijavljena!' });
    });
});



app.get('/sponsors', (req, res) => {
    const sql = "SELECT * FROM sponsors";

    db.query(sql, (err, results) => {
        if(err) {
            console.error('Našaka pri pridobibanju spozorja:', err);
            return res.status(500).json({error: true, message: 'napaka pri pridobivanju spozorjev'});
        }
        return res.json(results);
    });
}); 

app.get('/blog', (req, res) => {
    const sql = "SELECT * FROM blog";

    db.query(sql, (err, results) => {
        if(err) {
            console.error('Našaka pri pridobibanju blog:', err);
            return res.status(500).json({error: true, message: 'napaka pri pridobivanju blog'});
        }
        return res.json(results);
    });
}); 

app.get('/tournaments', (req, res) => {
    const sql = "SELECT t.id, t.name FROM tournaments t INNER JOIN games g ON t.game_id = g.id WHERE g.tournament_type = 1 AND t.status = 'active'";

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Napaka pri pridobivanju iger iz baze:', err);
            return res.status(500).json({ error: true, message: 'Napaka pri pridobivanju iger' });
        }
        return res.json(results);
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
const port = process.env.PORT || 8081;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

