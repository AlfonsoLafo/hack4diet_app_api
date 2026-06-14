const { response } = require('express');
const Avatar = require('../models/avatar.model');

const getAvatares = async (req, res = response) => {
    try {
        // Fetch all documents from the 'avatares' collection
        const avatares = await Avatar.find();

        res.json({
            ok: true,
            avatares
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
    getAvatares
};