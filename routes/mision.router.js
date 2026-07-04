const { Router } = require('express');
const { check, param, query } = require('express-validator');
const { validarJWT } = require('../middleware/validar-jwt');
const { validarCampos } = require('../middleware/validar-campos');

const {
    generarMisionDiaria,
    actualizarEstadoMision,
    getHistorialMisionesUsuario
} = require('../controllers/mision.controller');

const router = Router();

// Todas las misiones requieren estar autenticado
router.use(validarJWT);

router.post('/:idUsuario/hoy', [
    validarJWT,
    param('idUsuario', 'El ID del usuario debe ser un MongoID válido').isMongoId(),
    validarCampos
], generarMisionDiaria);

router.get('/:idUsuario', [
    validarJWT,
    param('idUsuario', 'El ID del usuario debe ser un MongoID válido').isMongoId(),
    validarCampos
], getHistorialMisionesUsuario);

router.put('/:id/completar', [
    param('id', 'El ID de la misión debe ser un MongoID válido').isMongoId(),
    check('estado', 'El estado es obligatorio y debe ser completada o fallida').isIn(['COMPLETADA', 'FALLIDA']),
    validarCampos
], actualizarEstadoMision);


module.exports = router;