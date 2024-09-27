
const express = require('express');
const jwt = require('jsonwebtoken');
const CoinPayments = require('coinpayments');
const db = require('../config/db');

const router = express.Router();
const SECRET_KEY = 'TU_SECRETO';

// Configuración de CoinPayments
const client = new CoinPayments({
  key: 'TU_PUBLIC_KEY',
  secret: 'TU_SECRET_KEY'
});

// Función para realizar pagos automáticos
function sendCryptoPayment(walletAddress, amount, currency = 'BTC') {
  return client.createWithdrawal({
    address: walletAddress,
    amount: amount,
    currency: currency,
    auto_confirm: 1
  });
}

// Ruta de reclamo
router.post('/claim', (req, res) => {
  const token = req.headers['authorization'];

  if (!token) return res.status(401).json({ error: 'Autorización requerida' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });

    const username = decoded.username;
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
      if (err || results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

      const user = results[0];
      const now = Date.now();

      if (user.lastClaim && now - user.lastClaim < 60 * 60 * 1000) {
        return res.status(429).json({ error: 'Debes esperar antes de reclamar nuevamente' });
      }

      const amountToClaim = Math.floor(Math.random() * 100000) + 1000; // Entre 1,000 y 100,000 Satoshis

      // Actualizar saldo y tiempo de reclamo
      const updateQuery = 'UPDATE users SET balance = balance + ?, lastClaim = ? WHERE username = ?';
      db.query(updateQuery, [amountToClaim, now, username], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al procesar el reclamo' });

        // Bonificación de referido
        if (user.referredBy) {
          const bonus = amountToClaim * 0.1; // 10% de bonificación para el referido
          const referralUpdateQuery = 'UPDATE users SET balance = balance + ? WHERE username = ?';
          db.query(referralUpdateQuery, [bonus, user.referredBy], (err, result) => {
            if (err) console.log('Error al dar la bonificación al referido');
          });
        }

        return res.json({ success: true, message: `Has reclamado ${amountToClaim} Satoshis!`, balance: user.balance + amountToClaim });
      });
    });
  });
});

// Ruta para retirar fondos
router.post('/withdraw', (req, res) => {
  const token = req.headers['authorization'];

  if (!token) return res.status(401).json({ error: 'Autorización requerida' });

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });

    const username = decoded.username;
    const { walletAddress, amount } = req.body;

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], (err, results) => {
      if (err || results.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

      const user = results[0];

      if (user.balance < amount) {
        return res.status(400).json({ error: 'Saldo insuficiente' });
      }

      // Enviar pago a través de CoinPayments
      sendCryptoPayment(walletAddress, amount)
        .then(response => {
          const updateQuery = 'UPDATE users SET balance = balance - ? WHERE username = ?';
          db.query(updateQuery, [amount, username], (err, result) => {
            if (err) return res.status(500).json({ error: 'Error al actualizar el saldo' });

            return res.json({ success: true, message: 'Pago procesado exitosamente', txId: response.txn_id });
          });
        })
        .catch(error => {
          return res.status(500).json({ error: 'Error al procesar el pago', details: error.message });
        });
    });
  });
});

module.exports = router;
