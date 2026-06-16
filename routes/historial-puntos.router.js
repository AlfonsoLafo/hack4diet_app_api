const { Router } = require('express');
const { check, query } = require('express-validator');
const { validarJWT } = require('../middleware/validar-jwt');
const { validarCampos } = require('../middleware/validar-campos');

const {
    getHistorialPuntos,
    crearEntradaHistorial
} = require('../controllers/historial-puntos.controller');

const router = Router();

// Aplicamos validarJWT a nivel global para todas las rutas de este archivo
router.use(validarJWT);

router.get('/', [
    check('limite', 'El límite debe ser un número entero').optional().isInt({ min: 1 }),
    check('desde', 'La fecha "desde" debe ser una fecha válida ISO8601').optional().isISO8601(),
    check('hasta', 'La fecha "hasta" debe ser una fecha válida ISO8601').optional().isISO8601(),
    validarCampos
], getHistorialPuntos);

router.post('/', [
    check('puntosGanados', 'La cantidad de puntos es obligatoria y debe ser un número').isNumeric(),
    check('justificacion', 'La justificación o motivo es obligatoria').not().isEmpty(),
    validarCampos
], crearEntradaHistorial);

module.exports = router;