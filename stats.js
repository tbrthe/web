const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Ruta para obtener estadísticas
router.get('/stats', (req, res) => {
  const query = 'SELECT COUNT(*) AS usersCount, SUM(balance) AS totalBalance FROM users';
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al obtener estadísticas' });

    return res.json({ success: true, stats: results[0] });
  });
});

module.exports = router;
