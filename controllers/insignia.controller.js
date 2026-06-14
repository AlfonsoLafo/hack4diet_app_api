const { response } = require('express');
const Insignia = require('../models/insignia.model');

const getInsignias = async (req, res = response) => {
    try {
        // Fetch all documents from the 'insignias' collection
        const insignias = await Insignia.find();

        res.json({
            ok: true,
            insignias
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            ok: false,
            msg: 'Algo ha salido mal'
        });
    }
};

module.exports = {
    getInsignias
};