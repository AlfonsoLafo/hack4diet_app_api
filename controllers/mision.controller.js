const { response } = require('express');
const Mision = require('../models/mision.model');
const HistorialPuntos = require('../models/historialPuntos.model');
const Usuario = require('../models/usuario.model');

const getMisionDiaria = async (req, res = response) => {
    const { idUsuario } = req.params;
    const idUsuarioToken = req.uidToken;

    if (idUsuario !== idUsuarioToken) {
        return res.status(403).json({
            ok: false,
            msg: 'No tienes permisos para consultar la misión de este usuario'
        });
    }

    try {
        // Calcular el rango de tiempo del día de HOY (00:00:00 a 23:59:59)
        const checkInicioDia = new Date();
        checkInicioDia.setHours(0, 0, 0, 0);

        const checkFinDia = new Date();
        checkFinDia.setHours(23, 59, 59, 999);

        let misionHoy = await Mision.findOne({
            idUsuario,
            fecha: { $gte: checkInicioDia, $lte: checkFinDia }
        }).populate('idMision');

        // Si existe, la devolvemos
        if (misionHoy) {
            return res.json({
                ok: true,
                msg: 'Misión diaria',
                nueva: false,
                mision: {
                    uid: misionHoy._id,
                    idUsuario: misionHoy.idUsuario,
                    fecha: misionHoy.fecha,
                    estado: misionHoy.estado,
                    puntosOtorgados: misionHoy.puntosOtorgados,
                    descripcion: misionHoy.idMision ? misionHoy.idMision.descripcion : 'Sin descripción'
                }
            });
        }

        // Si no existe, procedemos a generar una nueva
        const misionesDisponibles = await ListaMisiones.aggregate([{ $sample: { size: 1 } }]);

        if (!misionesDisponibles || misionesDisponibles.length === 0) {
            return res.status(404).json({
                ok: false,
                msg: 'No hay misiones configuradas en el repositorio (ListaMisiones)'
            });
        }

        const misionAleatoria = misionesDisponibles[0];

        // Calcular los puntos otorgados aleatorios entre el mínimo y el máximo de esa misión
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
            msg: 'Nueva misión diaria',
            nueva: true,
            mision: {
                uid: nuevaMisionAsignada._id,
                idUsuario: nuevaMisionAsignada.idUsuario,
                fecha: nuevaMisionAsignada.fecha,
                estado: nuevaMisionAsignada.estado,
                puntosOtorgados: nuevaMisionAsignada.puntosOtorgados,
                descripcion: misionAleatoria.descripcion
            }
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

        if (mision.estado !== 'pendiente') {
            return res.status(400).json({
                ok: false,
                msg: `Esta misión ya fue marcada previamente`
            });
        }

        if (estado === 'completada') {
            const puntosAGanar = mision.puntosOtorgados;
            const descripcionMision = mision.idMision.descripcion;

            const nuevaTransaccionPuntos = new HistorialPuntos({
                idUsuario: idUsuarioToken,
                fecha: new Date(),
                puntosGanados: puntosAGanar,
                justificacion: `Misión Completada: ${descripcionMision}`
            });
            await nuevaTransaccionPuntos.save();

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
    const { limite = 10, desde, hasta } = req.query;

    try {
        let queryFiltro = { idUsuario };

        if (desde || hasta) {
            queryFiltro.fecha = {};
            if (desde) queryFiltro.fecha.$gte = new Date(desde);
            if (hasta) queryFiltro.fecha.$lte = new Date(hasta);
        }

        const misionesDB = await Mision.find(queryFiltro)
            .populate('idMision') // Traemos el objeto completo de ListaMisiones temporalmente
            .sort({ fecha: -1 })
            .limit(Number(limite));

        const historialMisiones = misionesDB.map(misionDoc => {
            const mision = misionDoc.toObject(); 

            return {
                uid: mision._id, // Usamos la consistencia de tu toJSON()
                fecha: mision.fecha,
                estado: mision.estado,
                puntosOtorgados: mision.puntosOtorgados,
                // Extraemos la descripción del objeto poblado de forma segura
                descripcion: mision.idMision ? mision.idMision.descripcion : 'Misión sin descripción'
            };
        });

        res.json({
            ok: true,
            misiones: historialMisiones
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al recuperar el historial de misiones del usuario'
        });
    }
};

module.exports = {
    getMisionDiaria,
    getHistorialMisionesUsuario,
    actualizarEstadoMision,
};