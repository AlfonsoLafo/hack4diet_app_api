const { response } = require('express');
const Mision = require('../models/mision-diaria.model');
const MisionLista = require('../models/mision-lista.model');
const HistorialPuntos = require('../models/historial-puntos.model');
const Usuario = require('../models/usuario.model');

const generarMisionDiaria = async (req, res = response) => {
    const { idUsuario } = req.params;
    const idUsuarioToken = req.uidToken;

    if (idUsuario !== idUsuarioToken) {
        return res.status(403).json({
            ok: false,
            msg: 'No tienes permisos para consultar la misión de este usuario'
        });
    }

    try {
        const checkInicioDia = new Date();
        checkInicioDia.setHours(0, 0, 0, 0);

        const checkFinDia = new Date();
        checkFinDia.setHours(23, 59, 59, 999);

        await Mision.updateMany(
            {
                idUsuario,
                estado: 'PENDIENTE',
                fecha: { $lt: checkInicioDia }
            },
            {
                $set: { estado: 'FALLIDA' }
            }
        );

        let misionHoy = await Mision.findOne({
            idUsuario,
            fecha: { $gte: checkInicioDia, $lte: checkFinDia }
        }).populate('idMision');

        // Si existe, devolvemos ok indicando que no es nueva
        if (misionHoy) {    
            return res.json({
                ok: true,
                msg: 'Misión diaria ya existe',
                nueva: false
            });
        }

        // Si no existe, procedemos a generar una nueva
        const misionesDisponibles = await MisionLista.aggregate([{ $sample: { size: 1 } }]);

        if (!misionesDisponibles || misionesDisponibles.length === 0) {
            return res.status(404).json({
                ok: false,
                msg: 'No hay misiones configuradas en el repositorio (MisionLista)'
            });
        }

        const misionAleatoria = misionesDisponibles[0];

        const min = misionAleatoria.puntosMin;
        const max = misionAleatoria.puntosMax;
        const puntosCalculados = Math.floor(Math.random() * (max - min + 1)) + min;

        const nuevaMisionAsignada = new Mision({
            idMision: misionAleatoria._id,
            idUsuario,
            fecha: new Date(),
            estado: 'PENDIENTE',
            puntosOtorgados: puntosCalculados
        });

        await nuevaMisionAsignada.save();

        res.status(201).json({
            ok: true,
            msg: 'Nueva misión diaria creada',
            nueva: true
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al procesar la misión diaria del usuario'
        });
    }
};

const actualizarEstadoMision = async (req, res = response) => {
    const idMision = req.params.id;
    const { estado } = req.body;
    const idUsuarioToken = req.uidToken;

    try {
        const mision = await Mision.findById(idMision).populate('idMision');

        if (!mision) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró el registro de la misión'
            });
        }

        if (mision.idUsuario.toString() !== idUsuarioToken) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes permisos para modificar esta misión'
            });
        }

        if (mision.estado !== 'PENDIENTE') {
            return res.status(400).json({
                ok: false,
                msg: `Esta misión ya fue marcada previamente`
            });
        }

        if (estado === 'COMPLETADA') {
            const puntosAGanar = mision.puntosOtorgados;
            const descripcionMision = mision.idMision.descripcion;

            const usuario = await Usuario.findById(idUsuarioToken);
            if (usuario) {
                usuario.puntos = (usuario.puntos || 0) + puntosAGanar;
                if (!usuario.misionesCompletadas.includes(mision.idMision._id)) {
                    usuario.misionesCompletadas.push(mision.idMision._id);
                }
                await usuario.save();
            }
        }

        mision.estado = estado;
        await mision.save();

        res.json({
            ok: true,
            msg: `La misión ha sido ${estado}`,
            mision: mision
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar el estado de la misión'
        });
    }
};

const getHistorialMisionesUsuario = async (req, res = response) => {
    const { idUsuario } = req.params;

    try {
        // Buscamos las misiones, ordenamos por fecha descendente y limitamos a 15
        const misiones = await Mision.find({ idUsuario })
            .populate('idMision', 'descripcion puntos') // Hacemos populate para tener los textos
            .sort({ fecha: -1 })
            .limit(15);

        // Mapeamos para que el frontend reciba un objeto limpio (y arreglamos los puntos)
        const misionesFormateadas = misiones.map(m => {
            const estadoReal = String(m.estado).toUpperCase();
            let puntos = 0;

            if (estadoReal === 'COMPLETADA' || estadoReal === 'PENDIENTE') {
                puntos = m.puntosOtorgados || (m.idMision ? m.idMision.puntos : 10);
            }

            return {
                uid: m._id,
                idUsuario: m.idUsuario,
                fecha: m.fecha,
                estado: estadoReal,
                puntosOtorgados: puntos,
                descripcion: m.idMision ? m.idMision.descripcion : 'Sin descripción'
            };
        });

        res.json({
            ok: true,
            misiones: misionesFormateadas
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al obtener el historial de misiones' });
    }
};

module.exports = {
    generarMisionDiaria,
    getHistorialMisionesUsuario,
    actualizarEstadoMision,
};