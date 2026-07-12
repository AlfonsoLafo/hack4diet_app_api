const { Schema, model } = require('mongoose');

const UsuarioSchema = Schema(
    {
        nombre: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        sexo: {
            type: String,
            required: true
        },
        altura: {
            type: Number,
            required: true
        },
        edad: {
            type: Number,
            required: true
        },
        pesoInicial: {
            type: Number,
            required: true
        },
        pesoObjetivo: {
            type: Number
        },
        pesoActual: {
            type: Number,
            required: true
        },
        pesoHistorico: {
            pesoMedio: {
                type: Number,
            },
            pesoMaximo: {
                type: Number,
            },
            pesoMinimo: {
                type: Number,
            }
        },
        plan: {
            tipo: {
                type: String,
                required: true
            },
            nivelActividad: {
                type: String,
                required: true
            },
            caloriasDiarias: {
                type: Number,
            },
            carbosDiarios: {
                type: Number,
            },
            proteinasDiarias: {
                type: Number,
            },
            grasasDiarias: {
                type: Number,
            }
        },
        distribucionComidas: {
            type: [String],
            default: ['Desayuno', 'Almuerzo', 'Comida', 'Merienda', 'Cena']
        },
        configuracion: {
        type: Object, // Permite guardar un JSON anidado
            default: {
                tema: 'CLARO'
            }
        },
        codigoAmigo: {
            type: String,
            required: true,
            unique: true
        },
        puntos: {
            type: Number,
            default: 0
        },
        rachaActual: {
            type: Number,
            default: 0
        },
        historialRachas: [{
            fechaInicio: {
                type: Date,
                required: true
            },
            fechaFin: {
                type: Date
            },
        }],
        maximaRacha: {
            type: Number,
            default: 0
        },
        insigniasDesbloqueadas: [{
            type: Schema.Types.ObjectId,
            ref: 'Insignia'
        }],
        insigniasDestacada: [{
            type: Schema.Types.ObjectId,
            ref: 'Insignia'
        }],
        avatar: {
            type: Schema.Types.ObjectId,
            ref: 'Avatar'
        },
        amigos: [{
            uid: { type: Schema.Types.ObjectId, ref: 'Usuario' },
            codigoAmigo: { type: String },
            nombre: { type: String }
        }],
        solicitudesAmistad: [{ 
            uid: { type: Schema.Types.ObjectId, ref: 'Usuario' },
            nombre: { type: String },
            codigoAmigo: { type: String }
        }],
        misionesCompletadas: [{
            type: Schema.Types.ObjectId, 
            ref: 'Mision'
        }],
        recetasGuardadas: [{
            type: Schema.Types.ObjectId,
            ref: 'Receta'
        }],
        opcionesPrivacidad: {
            type: {
                currentStreak:  { type: Boolean, default: true },
                maximumStreak:  { type: Boolean, default: true },
                points:         { type: Boolean, default: true },
                badges:         { type: Boolean, default: true }
            },
            default: {
                currentStreak: true,
                maximumStreak: true,
                level: true,
                points: true,
                badges: true
            }
        }
    }, { collection: 'usuarios' }
);

UsuarioSchema.method('toJSON', function(){
    const { __v, _id, password, ...object } = this.toObject();
    
    object.uid = _id;
    return object;
});

module.exports = model('Usuario', UsuarioSchema);