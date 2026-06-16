const { Router } = require('express');
const { check, param, query } = require('express-validator');
const { validarJWT } = require('../middleware/validar-jwt');
const { validarCampos } = require('../middleware/validar-campos');

const {
    actualizarEstadoMision,
    getHistorialMisionesUsuario
} = require('../controllers/mision.controller');

const router = Router();

// Todas las misiones requieren estar autenticado
router.use(validarJWT);

router.get('/:idUsuario/hoy', [
    validarJWT,
    param('idUsuario', 'El ID del usuario debe ser un MongoID válido').isMongoId(),
    validarCampos
], getMisionDiaria);

router.get('/:idUsuario', [
    param('idUsuario', 'El ID del usuario debe ser un MongoID válido').isMongoId(),
    query('limite', 'El límite debe ser un número entero').optional().isInt({ min: 1 }),
    query('desde', 'La fecha "desde" debe ser una fecha válida ISO8601').optional().isISO8601(),
    query('hasta', 'La fecha "hasta" debe ser una fecha válida ISO8601').optional().isISO8601(),
    validarCampos
], getHistorialMisionesUsuario);

router.put('/:id/completar', [
    param('id', 'El ID de la misión debe ser un MongoID válido').isMongoId(),
    check('estado', 'El estado es obligatorio y debe ser completada o fallida').isIn(['completada', 'fallida']),
    validarCampos
], actualizarEstadoMision);


module.exports = router;