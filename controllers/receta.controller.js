const { response } = require('express');
const Receta = require('../models/receta.model');
const Usuario = require('../models/usuario.model');

const getRecetaById = async (req, res = response) => {
    const idReceta = req.params.id;

    try {
        const receta = await Receta.findById(idReceta);

        if (!receta) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró ninguna receta con ese ID'
            });
        }

        res.json({
            ok: true,
            receta
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener la receta'
        });
    }
};

const getRecetasUsuario = async (req, res = response) => {
    const idUsuario = req.params.idUsuario;

    try {
        const recetas = await Receta.find({ idPropietario: idUsuario });

        res.json({
            ok: true,
            recetas
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener las recetas del usuario'
        });
    }
};

const getRecetasGuardadas = async (req, res = response) => {
    const idUsuario = req.params.idUsuario;

    try {
        console.log('ID del usuario para obtener recetas guardadas:', idUsuario);
        const usuario = await Usuario.findById(idUsuario);

        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario desconocido'
            });
        }

        const recetasGuardadas = await Receta.find({
            _id: { $in: usuario.recetasGuardadas }
        });

        res.json({
            ok: true,
            recetas: recetasGuardadas
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener las recetas guardadas del usuario'
        });
    }
};


const crearReceta = async (req, res = response) => {
    const idPropietario = req.uidToken;

    try {
        const nuevaReceta = new Receta({
            idPropietario,
            ...req.body
        });

        const recetaGuardada = await nuevaReceta.save();

        res.status(201).json({
            ok: true,
            msg: 'Receta creada con éxito',
            receta: recetaGuardada
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: true,
            msg: 'Error al crear la receta'
        });
    }
};

const actualizarReceta = async (req, res = response) => {
    const idReceta = req.params.id;
    const idUsuarioToken = req.uidToken;

    try {
        // 1. Validar si la receta existe
        const recetaDB = await Receta.findById(idReceta);

        if (!recetaDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ninguna receta con ese ID'
            });
        }

        if (recetaDB.idPropietario.toString() !== idUsuarioToken) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para editar esta receta'
            });
        }

        const recetaActualizada = await Receta.findByIdAndUpdate(
            idReceta, 
            req.body, 
            { new: true }
        );

        res.json({
            ok: true,
            msg: 'Receta actualizada con éxito',
            receta: recetaActualizada
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar la receta'
        });
    }
};

const eliminarReceta = async (req, res = response) => {
    const idReceta = req.params.id;
    const idUsuarioToken = req.uidToken;

    try {
        const recetaDB = await Receta.findById(idReceta);

        if (!recetaDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró ninguna receta con ese ID'
            });
        }

        if (recetaDB.idPropietario.toString() !== idUsuarioToken) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para eliminar esta receta'
            });
        }

        await Receta.findByIdAndDelete(idReceta);

        res.json({
            ok: true,
            msg: 'Receta eliminada con éxito'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al intentar eliminar la receta'
        });
    }
};

const getRecetasAmigo = async (req, res = response) => {
    const codigoAmigoInput = req.params.codigo;
    const miId = req.uidToken; // El usuario logueado que quiere ver las recetas

    try {
        const amigo = await Usuario.findOne({ codigoAmigo: codigoAmigoInput });

        if (!amigo) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró ningún usuario con ese código de amigo'
            });
        }
        
        const somosAmigos = amigo.amigos && amigo.amigos.some(a => 
            a.uid && a.uid.toString() === miId.toString()
        );

        if (!somosAmigos) {
            return res.status(403).json({
                ok: false,
                msg: 'No sois amigos'
            });
        }
        const recetasAmigo = await Receta.find({
            idPropietario: amigo._id,
            publico: true
        });

        res.json({
            ok: true,
            recetas: recetasAmigo
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener las recetas del amigo'
        });
    }
};

const guardarReceta = async (req, res = response) => {
    const idReceta = req.params.id;
    const miId = req.uidToken;
    try {
        const recetaDB = await Receta.findById(idReceta);
        if (!recetaDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró ninguna receta con ese ID'
            });
        }

        const usuario = await Usuario.findById(miId);
        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        if (usuario.recetasGuardadas.includes(idReceta)) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya tienes guardada esta receta en tus favoritos'
            });
        }

        usuario.recetasGuardadas.push(idReceta);
        await usuario.save();

        res.json({
            ok: true,
            msg: `La receta "${recetaDB.nombre}" se ha guardado en tus favoritos con éxito`
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al intentar guardar la receta'
        });
    }
};

const desguardarReceta = async (req, res = response) => {
    const idReceta = req.params.id;
    const miId = req.uidToken;

    try {
        const usuario = await Usuario.findById(miId);
        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        if (!usuario.recetasGuardadas.includes(idReceta)) {
            return res.status(400).json({
                ok: false,
                msg: 'Esta receta no se encontraba en tu lista de favoritos'
            });
        }

        usuario.recetasGuardadas = usuario.recetasGuardadas.filter(
            id => id.toString() !== idReceta
        );

        await usuario.save();

        res.json({
            ok: true,
            msg: 'Receta eliminada de tus favoritos con éxito'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al intentar quitar la receta de favoritos'
        });
    }
};

module.exports = {
    getRecetaById,
    getRecetasUsuario,
    getRecetasGuardadas,
    crearReceta,
    actualizarReceta,
    eliminarReceta,
    getRecetasAmigo,
    guardarReceta,
    desguardarReceta
};