const { Router } = require('express');
const { check, param } = require('express-validator');
const { validarJWT } = require('../middleware/validar-jwt');
const { validarCampos } = require('../middleware/validar-campos');

const {
    getRecetasUsuario,
    getRecetasGuardadas,
    crearReceta,
    actualizarReceta,
    eliminarReceta,
    getRecetasAmigo,
    guardarReceta,
    desguardarReceta
} = require('../controllers/receta.controller');

const router = Router();

router.use(validarJWT);

router.get('/amigo/:codigo', [
    param('codigo', 'El código de amigo es obligatorio').not().isEmpty(),
    validarCampos
], getRecetasAmigo);

router.get('/:idUsuario', [
    param('idUsuario', 'El ID del usuario debe ser un MongoID válido').isMongoId(),
    validarCampos
], getRecetasUsuario);

router.get('/:idUsuario/guardadas', [
    param('idUsuario', 'El ID del usuario debe ser un MongoID válido').isMongoId(),
    validarCampos
], getRecetasGuardadas);

router.post('/', [
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('ingredientes', 'Los ingredientes deben ser un array de strings').isArray(),
check('pasos', 'Los pasos deben ser un array de strings').isArray(),
    check('dificultad', 'La dificultad es obligatoria y debe ser FACIL, MEDIA o DIFICIL').isIn(['FACIL', 'MEDIA', 'DIFICIL']),
    check('tiempoPreparacion', 'El tiempo de preparación es obligatorio y debe ser un número').isNumeric(),
    check('porciones', 'Las porciones son obligatorias y deben ser un número').isNumeric(),
    check('calorias', 'Las calorías son obligatorias y deben ser un número').isNumeric(),
    check('carbohidratos', 'Los carbohidratos son obligatorios y deben ser un número').isNumeric(),
    check('proteinas', 'Las proteínas son obligatorias y deben ser un número').isNumeric(),
    check('grasas', 'Las grasas son obligatorias y deben ser un número').isNumeric(),
    validarCampos
], crearReceta);

router.put('/:id', [
    param('id', 'El ID de la receta debe ser un MongoID válido').isMongoId(),
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('ingredientes', 'Los ingredientes deben ser un array de strings').isArray(),
    check('pasos', 'Los pasos deben ser un array de strings').isArray(),
    check('dificultad', 'La dificultad es obligatoria y debe ser FACIL, MEDIA o DIFICIL').isIn(['FACIL', 'MEDIA', 'DIFICIL']),
    check('tiempoPreparacion', 'El tiempo de preparación es obligatorio y debe ser un número').isNumeric(),
    check('porciones', 'Las porciones son obligatorias y deben ser un número').isNumeric(),
    check('calorias', 'Las calorías son obligatorias y deben ser un número').isNumeric(),
    check('carbohidratos', 'Los carbohidratos son obligatorios y deben ser un número').isNumeric(),
    check('proteinas', 'Las proteínas son obligatorias y deben ser un número').isNumeric(),
    check('grasas', 'Las grasas son obligatorias y deben ser un número').isNumeric(),
    validarCampos
], actualizarReceta);

router.delete('/:id', [
    param('id', 'El ID de la receta debe ser un MongoID válido').isMongoId(),
    validarCampos
], eliminarReceta);

router.post('/:id/guardar', [
    param('id', 'El ID de la receta debe ser un MongoID válido').isMongoId(),
    validarCampos
], guardarReceta);

router.delete('/:id/guardar', [
    param('id', 'El ID de la receta debe ser un MongoID válido').isMongoId(),
    validarCampos
], desguardarReceta);

module.exports = router;