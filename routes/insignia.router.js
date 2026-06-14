const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middleware/validar-campos');

const {
    getInsignias
} = require('../controllers/insignia.controller');

const router = Router();

router.get('/', [

], getInsignias);

module.exports = router;