const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const axios = require('axios');

const router = express.Router();
const SECRET_KEY = 'TU_SECRETO';

// Ruta de registro
router.post('/register', (req, res) => {
  const { username, password, referredBy, recaptchaToken } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);

  // Verificar el reCAPTCHA
  axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=TU_SECRET_KEY&response=${recaptchaToken}`)
    .then(response => {
      if (response.data.success) {
        // Verificación de reCAPTCHA exitosa
        const query = 'INSERT INTO users (username, password, balance, referredBy) VALUES (?, ?, 0, ?)';
        db.query(query, [username, hashedPassword, referredBy || null], (err, result) => {
          if (err) return res.status(500).json({ error: 'Error en el registro' });

          const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '24h' });
          return res.status(201).json({ success: true, token });
        });
      } else {
        return res.status(400).json({ error: 'Captcha inválido' });
      }
    })
    .catch(err => res.status(500).json({ error: 'Error en la verificación del captcha' }));
});

// Ruta de inicio de sesión
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = results[0];
    const passwordIsValid = bcrypt.compareSync(password, user.password);

    if (!passwordIsValid) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: '24h' });
    return res.json({ success: true, token });
  });
});

module.exports = router;
