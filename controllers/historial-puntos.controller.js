const { response } = require('express');
const HistorialPuntos = require('../models/historial-puntos.model');
const Usuario = require('../models/usuario.model');

const getHistorialPuntos = async (req, res = response) => {
    const idUsuario = req.uidToken;
    const { limite = 50, desde, hasta } = req.query;

    try {
        let queryFiltro = { idUsuario };

        if (desde || hasta) {
            queryFiltro.fecha = {};
            if (desde) queryFiltro.fecha.$gte = new Date(desde); // Mayor o igual que 'desde'
            if (hasta) queryFiltro.fecha.$lte = new Date(hasta); // Menor o igual que 'hasta'
        }

        const historial = await HistorialPuntos.find(queryFiltro)
            .sort({ fecha: -1 })
            .limit(Number(limite));

        res.json({
            ok: true,
            historial
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener el historial de puntos'
        });
    }
};

const crearEntradaHistorial = async (req, res = response) => {
    const idUsuario = req.uidToken;
    const { puntosGanados, justificacion } = req.body;

    try {
        const usuario = await Usuario.findById(idUsuario);
        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario no encontrado'
            });
        }

        const nuevaEntrada = new HistorialPuntos({
            idUsuario,
            puntosGanados,
            justificacion,
            fecha: new Date()
        });

        await nuevaEntrada.save();

        usuario.puntos = (usuario.puntos || 0) + Number(puntosGanados);
        await usuario.save();

        res.status(201).json({
            ok: true,
            msg: 'Transacción de puntos registrada con éxito',
            transaccion: nuevaEntrada,
            puntosTotalesActuales: usuario.puntos
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al registrar la transacción de puntos'
        });
    }
};

module.exports = {
    getHistorialPuntos,
    crearEntradaHistorial
};