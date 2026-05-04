const express = require('express');
const { authMiddleware } = require('../middleware/auth.middleware');
const accountController = require('../controllers/account.controller');
const router = express.Router();


router.post("/", authMiddleware, accountController.createAccountController);

router.post("/create", authMiddleware, accountController.createAccountController);

router.get("/get", authMiddleware, accountController.getUserAccountController);

router.get("/balance/:accountId", authMiddleware, accountController.getAccountBalanceController);

module.exports = router;
