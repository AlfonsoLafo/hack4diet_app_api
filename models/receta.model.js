const { Schema, model } = require('mongoose');

const RecetaSchema = Schema(
    {
        idPropietario: {
            type: Schema.Types.ObjectId, 
            ref: 'Usuario', 
            required: true 
        },
        publico: {
            type: Boolean,
            default: false
        },
        nombre: {
            type: String,
            required: true
        },
        descripcion: {
            type: String,
        },
        ingredientes: [ {
            type: String,
            required: true
            }
        ],
        pasos: [ {
            type: String,
            required: true
            }
        ],
        dificultad:{
            type: String,
            required: true,
            enum: ['FACIL', 'MEDIA', 'DIFICIL'], 
        },
        tiempoPreparacion:{
            type: Number,
            required: true
        },
        porciones:{
            type: Number,
            required: true
        },
        calorias: {
            type: Number,
            required: true
        },
        carbohidratos: {
            type: Number,
            required: true
        },
        proteinas: {
            type: Number,
            required: true
        },
        grasas: {
            type: Number,
            required: true
        }
    }, { collection: 'recetas' }
);

RecetaSchema.method('toJSON', function(){
    const { __v, _id, ...object } = this.toObject();
    
    object.uid = _id;
    return object;
});

module.exports = model('Receta', RecetaSchema);