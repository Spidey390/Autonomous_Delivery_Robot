const { body, param, query, validationResult } = require('express-validator');

exports.validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req, { bail: true })));

    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    const extractedErrors = errors.array().map(err => ({ [err.path]: err.msg }));
    return res.status(400).json({ errors: extractedErrors });
  };
};

exports.loginRules = () => [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.userRules = () => [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['admin', 'staff']).withMessage('Role must be admin or staff'),
];

exports.deliveryRules = () => [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

exports.presetRules = () => [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

exports.otpRules = () => [
  body('deliveryId').trim().notEmpty().withMessage('Delivery ID is required'),
];

exports.commandRules = () => [
  body('command').trim().notEmpty().withMessage('Command is required'),
];
