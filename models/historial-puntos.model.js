const { Schema, model } = require('mongoose');

const HistorialPuntosSchema = new mongoose.Schema({
    idUsuario: { 
        type: Schema.Types.ObjectId, 
        ref: 'Usuario', 
        required: true 
    },
    fecha: { 
        type: Date, 
        required: true 
    },
    puntosGanados: { 
        type: Number, 
        required: true 
    },
    justificacion: { 
        type: String,
        required: true 
    },
}, { collection: 'historial_puntos' }
);

HistorialPuntosSchema.method('toJSON', function(){
    const { __v, _id, ...object } = this.toObject();
    
    object.uid = _id;
    return object;
});

module.exports = model('HistorialPuntos', HistorialPuntosSchema);
