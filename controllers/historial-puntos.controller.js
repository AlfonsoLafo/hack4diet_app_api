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
// auxiliar
const calcularNivel = (puntos) => {
    if (!puntos || puntos < 0) return 1;
    // Math.floor para redondear hacia abajo. Todos empiezan en nivel 1.
    return Math.floor(0.2 * Math.sqrt(puntos)) + 1;
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

        const nivelAnterior = usuario.nivel;
        usuario.puntos = (usuario.puntos) + Number(puntosGanados);
        usuario.nivel = calcularNivel(usuario.puntos);
        const subioDeNivel = usuario.nivel > nivelAnterior;
        await usuario.save();

        console.log(nuevaEntrada);

        res.status(201).json({
            ok: true,
            msg: 'Transacción de puntos registrada con éxito',
            transaccion: nuevaEntrada,
            puntosTotalesActuales: usuario.puntos,
            nivelActual: usuario.nivel,
            subioDeNivel
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