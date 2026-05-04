const express = require('express');
const authController = require('../controllers/auth.controller');
const accountController = require('../controllers/account.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Register user
router.post('/register', authController.userRegisterController);

// Login user
router.post('/login', authController.userLoginController);

// Create account
// IMPORTANT: middleware directly pass karo, .authMiddleware mat lagao unless file exports object
router.post('/accounts', authMiddleware, accountController.createAccountController);

module.exports = router;
