const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middleware/validar-campos');

const {
    getAvatares
} = require('../controllers/avatar.controller');

const router = Router();

router.get('/', [

], getAvatares);

module.exports = router;