const Usuario = require('../models/usuario.model');
const RegistroPeso = require('../models/registro-peso.model');
const Alimento = require('../models/alimento.model');
const Diario = require('../models/diario.model');
const MedidaCorporal = require('../models/medida-corporal.model');
const Avatar  = require('../models/avatar.model');
const ActividadFisica = require('../models/actividad-fisica.model');
const ActividadRealizada = require('../models/actividad-realizada.model');
const { response  }= require('express');
const bcrypt = require('bcryptjs');
const { createMedidasCorporalesDefault } = require('./medidas-corporales.controller');
const { SexoEnum } = require("../enums/sexo.enum");
const { PlanEnum } = require("../enums/plan.enum");
const { NivelActividadEnum } = require("../enums/nivel-actividad.enum");
const crypto = require('crypto');

const getUserById = async(req, res = response) => {
    const uid = req.params.id;

    console.log('Obteniendo usuario con id: ', uid);

    try {
        const usuario = await Usuario.findById(uid).select('-rachaActual -maximaRacha -historialRachas -solicitudesAmistad -misionesCompletadas -recetasGuardadas -password');

        // KO -> usuario no existe
        if(!usuario) {
            return res.status(400).json({
                ok: false,
                msg: "No existe ningún usuario para el id: " + uid
            });
        }

        // OK 
        res.json({
            ok: true,
            msg: 'getUserById',
            usuario
        });

    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            msg: 'Error obteniendo usuario por id: ' + uid
        });
    }
}

const getUserByEmail = async(req, res = response) => {
    const email = req.params.email;

    console.log('Obteniendo usuario con email: ', email);

    try {
        const usuario = await Usuario.findOne({ email }).select('-rachaActual -maximaRacha -historialRachas -solicitudesAmistad -misionesCompletadas -recetasGuardadas -password');

        // KO -> usuario no existe
        // No enviamos error 400 porque queremos que siga la ejecución
        if(!usuario) {
            return res.json({
                ok:false,
                msg:"No existe ningún usuario para el email: " + email
            });
        }

        // OK 
        res.json({
            ok: true,
            msg: 'getUserByEmail',
            usuario
        });

    } catch (error) {
        console.log(error);
        res.json({
            ok: false,
            msg: 'Error obteniendo usuario por email: ' + email
        });
    }
}

const getLeaderboard = async (req, res = response) => {
    const idUsuario = req.uidToken;

    try {
        const usuario = await Usuario.findById(idUsuario).populate('amigos.uid');
        
        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró ningún usuario'
            });
        }

        const leaderboard = usuario.amigos.map(amigoRef => {
            const amigo = amigoRef.uid; 
            if (!amigo) return null; 

            const { currentStreak, maximumStreak, points, badges } = amigo.opcionesPrivacidad || {};
            
            const datosPublicosAmigo = {
                nombre: amigo.nombre,
                codigoAmigo: amigo.codigoAmigo,
                avatar: amigo.avatar,
                insigniaDestacada: amigo.insigniaDestacada,
                esYo: false
            };

            if (currentStreak)  datosPublicosAmigo.rachaActual = amigo.rachaActual;
            if (maximumStreak)  datosPublicosAmigo.maximaRacha = amigo.maximaRacha;
            if (points)         datosPublicosAmigo.puntos      = amigo.puntos;
            if (badges)         datosPublicosAmigo.insigniasDesbloqueadas = amigo.insigniasDesbloqueadas;

            return datosPublicosAmigo;
            
        }).filter(item => item !== null);

        leaderboard.push({
            nombre: usuario.nombre,
            codigoAmigo: usuario.codigoAmigo,
            avatar: usuario.avatar,
            insigniaDestacada: usuario.insigniaDestacada,
            rachaActual: usuario.rachaActual,
            maximaRacha: usuario.maximaRacha,
            puntos: usuario.puntos,
            insigniasDesbloqueadas: usuario.insigniasDesbloqueadas,
            esYo: true
        });

        leaderboard.sort((a, b) => (b.puntos || 0) - (a.puntos || 0));

        res.json({
            ok: true,
            leaderboard
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al generar la tabla de clasificación'
        });
    }
};

const getPerfilPublicoPorCodigo = async (req, res = response) => {
    const codigo = req.params.codigo;

    try {
        // Buscamos al usuario por su código trayendo todos los campos potenciales
        const usuario = await Usuario.findOne({ codigoAmigo: codigo});
        if (!usuario) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró ningún usuario con ese código'
            });
        }

        // Extraemos las opciones de privacidad configuradas por el usuario
        const { currentStreak, maximumStreak, nivel, points, insignias } = usuario.opcionesPrivacidad;

        const perfilPublico = {
            nombre: usuario.nombre,
            friendCode: usuario.friendCode,
            insigniaDestacada: usuario.insigniaDestacada
        };

        // Filtramos dinámicamente según sus preferencias
        if (usuario.opcionesPrivacidad.currentStreak) perfilPublico.rachaActual            = usuario.rachaActual;
        if (usuario.opcionesPrivacidad.maximumStreak) perfilPublico.maximaRacha            = usuario.maximaRacha;
        if (usuario.opcionesPrivacidad.points)        perfilPublico.puntos                 = usuario.puntos;
        if (usuario.opcionesPrivacidad.badges)        perfilPublico.insigniasDesbloqueadas = usuario.insigniasDesbloqueadas; // Aquí irían sus insignias vinculadas

        res.json({
            ok: true,
            usuario: perfilPublico
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al procesar la solicitud del perfil público'
        });
    }
};

const getRachaActual = async (req, res = response) => {
    const uid = req.uidToken; // Extraído de validarJWT

    try {
        const usuario = await Usuario.findById(uid).select('rachaActual maximaRacha historialRachas');
        
        if (!usuario) {
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        }

        let rachaRegistradaHoy = false;

        if (usuario.rachaActual > 0 && usuario.historialRachas && usuario.historialRachas.length > 0) {
            const ultimaRacha = usuario.historialRachas[usuario.historialRachas.length - 1];
            
            const hoy = new Date();
            hoy.setUTCHours(0, 0, 0, 0);

            const inicio = new Date(ultimaRacha.fechaInicio);
            inicio.setUTCHours(0, 0, 0, 0);

            // Calcula el último día
            const ultimoDiaRegistrado = new Date(inicio);
            ultimoDiaRegistrado.setUTCDate(ultimoDiaRegistrado.getUTCDate() + (usuario.rachaActual - 1));
            if (ultimoDiaRegistrado.getTime() === hoy.getTime()) {
                rachaRegistradaHoy = true;
            }
        }

        res.json({
            ok: true,
            rachaActual: usuario.rachaActual,
            maximaRacha: usuario.maximaRacha,
            rachaRegistradaHoy
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al obtener la racha actual' });
    }
};

const getHistorialRachas = async (req, res = response) => {
    const uid = req.uidToken;
    const { mes, anio } = req.query;

    try {
        const usuario = await Usuario.findById(uid).select('rachaActual maximaRacha historialRachas');
        if (!usuario) {
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        }

        let historialFiltrado = usuario.historialRachas || [];

        if (mes && anio) {
            const m = parseInt(mes) - 1; // JS Months 0-11
            const a = parseInt(anio);

            historialFiltrado = historialFiltrado.filter(racha => {
                const inicio = new Date(racha.fechaInicio);
                const fin = racha.fechaFin ? new Date(racha.fechaFin) : new Date(); // Si no tiene fin, está activa hoy

                const entraEnAnio = inicio.getFullYear() === a || fin.getFullYear() === a;
                const entraEnMes = inicio.getMonth() === m || fin.getMonth() === m || (inicio.getMonth() < m && fin.getMonth() > m);

                return entraEnAnio && entraEnMes;
            });
        }

        res.json({
            ok: true,
            rachaActual: usuario.rachaActual,
            maximaRacha: usuario.maximaRacha,
            historial: historialFiltrado
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al procesar el historial de rachas' });
    }
};

const enviarSolicitudAmistad = async (req, res = response) => {
    const idSolicitante = req.uidToken;
    const { codigoAmigo } = req.body;

    try {
        const usuarioDestino = await Usuario.findOne({ codigoAmigo: codigoAmigo });
        const yo = await Usuario.findById(idSolicitante);

        if (!usuarioDestino) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró ningún usuario con ese código de amigo'
            });
        }

        if (usuarioDestino._id.toString() === idSolicitante) {
            return res.status(400).json({
                ok: false,
                msg: 'No puedes enviarte una solicitud de amistad a ti mismo'
            });
        }

        if (usuarioDestino.amigos.includes(idSolicitante)) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya eres amigo de este usuario'
            });
        }

        if (usuarioDestino.solicitudesAmistad.includes(idSolicitante)) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya has enviado una solicitud de amistad a este usuario'
            });
        }

        usuarioDestino.solicitudesAmistad.push({
            uid: yo._id,
            nombre: yo.nombre,
            codigoAmigo: yo.codigoAmigo
        });
        await usuarioDestino.save();

        res.json({
            ok: true,
            msg: 'Solicitud de amistad enviada con éxito'
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al enviar la solicitud de amistad'
        });
    }
};

const responderSolicitudAmistad = async (req, res = response) => {
    const miId = req.uidToken; // El usuario que está logueado (y recibió la solicitud)
    const { idSolicitante, decision } = req.body;

    try {
        const yo = await Usuario.findById(miId);
        const solicitante = await Usuario.findById(idSolicitante);

        if (!yo || !solicitante) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario o solicitante no encontrado'
            });
        }

        const tieneSolicitudPendiente = yo.solicitudesAmistad.some(
            sol => sol.uid.toString() === idSolicitante
        );

        if (!tieneSolicitudPendiente) {
            return res.status(400).json({
                ok: false,
                msg: 'No tienes ninguna solicitud de amistad pendiente de este usuario'
            });
        }

        if (decision === 'ACEPTAR') {

            yo.amigos.push({
                uid: solicitante._id,
                codigoAmigo: solicitante.codigoAmigo,
                nombre: solicitante.nombre
            });
            
            solicitante.amigos.push({
                uid: yo._id,
                codigoAmigo: yo.codigoAmigo,
                nombre: yo.nombre
            });

            yo.solicitudesAmistad = yo.solicitudesAmistad.filter(
                sol => sol.uid.toString() !== idSolicitante
            );

            // Guardamos los cambios en ambos documentos
            await yo.save();
            await solicitante.save();

            return res.json({
                ok: true,
                msg: `Has aceptado la solicitud de amistad de ${solicitante.nombre}`
            });

        } else if (decision === 'RECHAZAR') {
            
            // Limpiamos la solicitud de mi lista de pendientes
            yo.solicitudesAmistad = yo.solicitudesAmistad.filter(
                sol => sol.uid.toString() !== idSolicitante
            );
            
            await yo.save();

            return res.json({
                ok: true,
                msg: `Has rechazado la solicitud de amistad de ${solicitante.nombre}`
            });
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al procesar la respuesta de la solicitud de amistad'
        });
    }
};

const createUser = async(req, res = response) => {

    console.log('Creando usuario');

    const { email, password } = req.body;

    try{
        const existeEmail = await Usuario.findOne({ email });

        // KO -> existe un usuario con ese email
        if(existeEmail){
            return  res.status(400).json({
                ok: false,
                msg:"Ya existe un usuario con este email: " + email
            })
        }
    
        const salt = bcrypt.genSaltSync();
        const cpassword = bcrypt.hashSync(password, salt);

        const object = req.body;
        const usuario = new Usuario(object);
        usuario.password = cpassword;

        usuario.plan = calcularMacronutrientes(usuario.plan.tipo, usuario.plan.nivelActividad, usuario.sexo, usuario.pesoInicial, 
                                            usuario.altura, usuario.edad);

        // Establecemos los pesos historicos del usuario
        usuario.pesoHistorico.pesoMedio = usuario.pesoInicial;
        usuario.pesoHistorico.pesoMaximo = usuario.pesoInicial;
        usuario.pesoHistorico.pesoMinimo = usuario.pesoInicial;
        usuario.pesoActual = usuario.pesoInicial;
        
        const avatares = await Avatar.find();
        console.log(avatares);
        usuario.avatar = avatares[0]._id

        // Creamos un código de amigo
        const hash = crypto.createHash('sha256').update(usuario.email).digest('hex');
        const chunk = hash.slice(0, 8).toUpperCase();
        usuario.codigoAmigo = chunk;
        
        await usuario.save();

        // Añadimos un primer registro de peso para el usuario 
        const registro = new RegistroPeso();
        registro.fecha = new Date();
        registro.peso = usuario.pesoInicial;
        registro.idUsuario = usuario._id;

        // Creamos unas medidas corporales por defecto
        await createMedidasCorporalesDefault(usuario._id);

        await registro.save();

        res.json({
            ok:true,
            msg:"createUser",
            usuario
        });
    }
    catch(error){
        console.log(error);
        return  res.status(400).json({
            ok: false,
            msg:'Error creando usuario'
        })
    }
}

const calcularPuntosRacha = (dias) => {
    if (dias >= 7) return 15; // Límite máximo
    return 3 + ((dias - 1) * 2); // Progresión: 3, 5, 7, 9, 11, 13, 15
};

const actualizarRacha = async (req, res = response) => {
    const uid = req.uidToken;

    try {
        const usuario = await Usuario.findById(uid);
        
        if (!usuario) {
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        }

        const hoy = new Date();
        hoy.setUTCHours(0, 0, 0, 0);

        if (usuario.historialRachas.length === 0 || usuario.rachaActual === 0) {
            usuario.rachaActual = 1;
            usuario.historialRachas.push({ fechaInicio: hoy });
            usuario.maximaRacha = Math.max(usuario.rachaActual, usuario.maximaRacha || 0);
            
            await usuario.save();
            return res.json({ ok: true, msg: 'Racha iniciada', rachaActual: usuario.rachaActual });
        }

        // else
        const ultimaRacha = usuario.historialRachas[usuario.historialRachas.length - 1];
        
        const ultimoDiaActivo = new Date(ultimaRacha.fechaInicio);
        ultimoDiaActivo.setUTCHours(0, 0, 0, 0);
        ultimoDiaActivo.setUTCDate(ultimoDiaActivo.getUTCDate() + (usuario.rachaActual - 1));

        // Diferencia en días entre hoy y el último día registrado con éxito
        const diffTiempo = hoy.getTime() - ultimoDiaActivo.getTime();
        const diasDeDiferencia = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));

        if (diasDeDiferencia === 0) {
            // Caso 1: Ya registró, mostramos la racha actual
            return res.json({ ok: true, msg: 'Actividad guardada. Racha ya actualizada hoy.', rachaActual: usuario.rachaActual });
        } 
        
        if (diasDeDiferencia === 1) {
            // Caso 2: Aumentamos la racha.
            usuario.rachaActual += 1;
            usuario.maximaRacha = Math.max(usuario.rachaActual, usuario.maximaRacha || 0);
            mensaje = '¡Racha incrementada!';
        } else {
            // Caso 3: Rompio la racha. Inicia una nueva
            ultimaRacha.fechaFin = ultimoDiaActivo;
            usuario.rachaActual = 1;
            usuario.historialRachas.push({ fechaInicio: hoy });
            mensaje = 'Nueva racha iniciada.';
        }

        // Sequencia: 3, 5, 7, 9, 11, 13, 15, 15, 15 ...
        const puntosGanados = Math.min(3 + ((usuario.rachaActual-1)*2), 15);

        await usuario.save();
        
        res.json({
            ok: true,
            msg: mensaje,
            rachaActual: usuario.rachaActual,
            maximaRacha: usuario.maximaRacha,
            puntosGanados
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al subir una racha' });
    }
};

const updateUser = async(req, res = response) => {

    
    const { password, email, pesoInicial, pesoActual, pesoHistorico, plan, ...object } = req.body;
    const uid = req.params.id;

    console.log('Editando usuario con id: ', uid);

    try {
        const existeUsuario= await Usuario.findById(uid);
        // KO -> no existe el usuario
        if(!existeUsuario){
            return  res.status(400).json({
                ok:false,
                msg:'El usuario no existe'
            })
        }
    
        const existeEmail = await Usuario.findOne({ email });
    
        // KO -> existe un usuario con ese email
        if(existeEmail && existeEmail._id != uid) {
            return  res.status(400).json({
                ok: false,
                msg:"Ya existe un usuario con este email: " + email
            });
        }

        const sexo = object.sexo ? object.sexo : existeUsuario.sexo;
        const altura = object.altura ? object.altura : existeUsuario.altura;
        const edad = object.edad ? object.edad : existeUsuario.edad;
        object.plan = calcularMacronutrientes(plan.tipo, plan.nivelActividad, sexo, existeUsuario.pesoActual, altura, edad);
    
        object.email = email;
        const usuarioActualizado = await Usuario.findByIdAndUpdate(uid, object, { new: true }); 
    
        res.json({
            ok:true,
            msg:"updateUser",
            usuarioActualizado
        })
    } catch(error){
        console.log(error);
        return res.status(400).json({
            ok: false,
            msg:'Error actualizando usuario'
        })
    }
}

const updatePassword = async(req, res = response) => {

    const uid = req.params.id;
    const { password, newPassword, newPassword2 } = req.body;

    console.log('Editando contraseña del usuario con id: ', uid);

    try {

        const usuarioBD = await Usuario.findById(uid);
        if (!usuarioBD) {
            return res.status(400).json({
                ok: false,
                msg: 'Este usuario no existe',
            });
        }

        const validPassword = bcrypt.compareSync(password, usuarioBD.password);
        // Se comprueba que sabe la contraseña vieja y que ha puesto dos veces la contraseña nueva
        if (!validPassword) {
            return res.status(400).json({
                ok: false,
                msg: 'La contraseña es incorrecta',
                token: ''
            });
        }

        if (newPassword !== newPassword2) {
            return res.status(400).json({
                ok: false,
                msg: 'Las contraseñas no coinciden',
            });
        }

        // tenemos todo OK, ciframos la nueva contraseña y la actualizamos
        const salt = bcrypt.genSaltSync();
        const cpassword = bcrypt.hashSync(newPassword, salt);
        usuarioBD.password = cpassword;

        // Almacenar en BD
        await usuarioBD.save();

        res.json({
            ok: true,
            msg: 'Contraseña actualizada'
        });

    } catch (error) {
        return res.status(400).json({
            ok: false,
            msg: 'Error al actualizar contraseña',
        });
    }


}

const verificarRachaExpirada = async (req, res = response) => {
    const uid = req.uidToken;
    try {
        const usuario = await Usuario.findById(uid);
        
        if (!usuario) {
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        }

        // Si ya está a 0 o no tiene historial, return
        if (!usuario.rachaActual || usuario.rachaActual === 0 || !usuario.historialRachas || usuario.historialRachas.length === 0) {
            return res.json({ ok: true, msg: 'Sin racha activa que verificar.', rachaActual: 0 });
        }

        const hoy = new Date();
        hoy.setUTCHours(0, 0, 0, 0);

        const ultimaRacha = usuario.historialRachas[usuario.historialRachas.length - 1];
        const ultimoDiaActivoReal = new Date(ultimaRacha.fechaInicio);
        ultimoDiaActivoReal.setUTCHours(0, 0, 0, 0);
        ultimoDiaActivoReal.setUTCDate(ultimoDiaActivoReal.getUTCDate() + (usuario.rachaActual - 1));
        // Calculamos cuántos días han pasado desde su último día activo hasta HOY
        const diffTiempo = hoy.getTime() - ultimoDiaActivoReal.getTime();
        const diasSinRegistrar = Math.round(diffTiempo / (1000 * 60 * 60 * 24));

        if (diasSinRegistrar > 1) {
            
            ultimaRacha.fechaFin = ultimoDiaActivoReal;
            usuario.rachaActual = 0;
            await usuario.save();

            return res.json({  
                ok: true,
                msg: 'La racha había expirado. Se ha actualizado el historial.',
                rachaActual: usuario.rachaActual,
                rachaRota: true
            });
        }

        res.json({
            ok: true,
            msg: 'La racha sigue vigente.',
            rachaActual: usuario.rachaActual,
            rachaRota: false
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ ok: false, msg: 'Error al verificar la expiración de la racha' });
    }
};

const deleteUser = async(req, res = response) => {
    const uid = req.params.id;

    console.log('Eliminando usuario con id: ', uid);

    try {

        const existeUsuario = await Usuario.findById(uid);

        // KO -> no existe el usuario
        if(!existeUsuario){
            return res.status(400).json({
                ok:false,
                msg:"El usuario no existe"
            });
        }

        const usuarioEliminado = await Usuario.findByIdAndDelete(uid);

        // Eliminamos todos los registros del resto de colecciones que esten relacionadas con este usuario
        await Alimento.deleteMany({ idUsuario: uid });
        await RegistroPeso.deleteMany({ idUsuario: uid });
        await Diario.deleteMany({ idUsuario: uid });
        await MedidaCorporal.deleteMany({ idUsuario: uid });
        await ActividadRealizada.deleteMany({ idUsuario: uid });
        await ActividadFisica.deleteMany({ idUsuario: uid });

        // OK
        res.json({
            ok:true,
            msg:"deleteUser",
            usuarioEliminado
        })

    } catch(error){
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error borrando usuario'
        })
    }
}

const calcularMacronutrientes = (tipoPlan, nivelActividad, sexo, peso, altura, edad) => {
    const plan = { tipo: tipoPlan, nivelActividad };

    // Calculamos la Tasa Metabolica Basal
    let tmb;
    if(sexo === SexoEnum.HOMBRE) {
        tmb = 10 * peso + 6.25 * altura - 5 * edad + 5;
    } else {
        tmb = 10 * peso + 6.25 * altura - 5 * edad - 161;
    }

    // Calculamos el nivel de actividad fisica
    let pal;
    switch(nivelActividad) {
        case NivelActividadEnum.SEDENTARIO:
            pal = 1.55;
            break;
        case NivelActividadEnum.MODERADO:
            pal = 1.85;
            break;
        case NivelActividadEnum.ALTO:
            pal = 2.2;
            break;
        default:
            pal = 2.4;
    }

    // Aqui obtenemos las calorias necesarias
    let caloriasDiarias = Math.trunc(tmb * pal);
    if(tipoPlan === PlanEnum.PERDER_PESO) {
        caloriasDiarias = caloriasDiarias - 500;
    } else if(tipoPlan === PlanEnum.GANAR_PESO) {
        caloriasDiarias = caloriasDiarias + 500;
    }

    // Calculamos las cantidades de cada macronutriente
    const proteinasDiarias = Math.trunc(2.5 * peso);
    const porcentajeGrasas = 30;
    const caloriasProteinas = 4 * proteinasDiarias;
    const caloriasGrasas = Math.trunc((porcentajeGrasas * caloriasDiarias)/100);
    const grasasDiarias = Math.trunc(caloriasGrasas/9);
    const caloriasCarbos = caloriasDiarias - (caloriasProteinas + caloriasGrasas);
    const carbosDiarios = Math.trunc(caloriasCarbos/4);

    plan.caloriasDiarias = caloriasDiarias;
    plan.proteinasDiarias = proteinasDiarias;
    plan.carbosDiarios = carbosDiarios;
    plan.grasasDiarias = grasasDiarias;

    return plan;
}

const deleteAmigo = async (req, res = response) => {
    const miId = req.uidToken;
    const idAmigo = req.params.idAmigo;

    try {
        const yo = await Usuario.findById(miId);
        const amigo = await Usuario.findById(idAmigo);

        if (!yo || !amigo) {
            return res.status(404).json({
                ok: false,
                msg: 'Usuario o amigo no encontrado'
            });
        }

        const amigoExiste = yo.amigos.some(
            a => a.uid.toString() === idAmigo
        );

        if (!amigoExiste) {
            return res.status(400).json({
                ok: false,
                msg: 'Este usuario no está en tu lista de amigos'
            });
        }

        yo.amigos = yo.amigos.filter(
            a => a.uid.toString() !== idAmigo
        );
        
        amigo.amigos = amigo.amigos.filter(
            a => a.uid.toString() !== miId
        );

        await yo.save();
        await amigo.save();

        res.json({
            ok: true,
            msg: `Has eliminado a ${amigo.nombre} de tus amigos con éxito`
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error al intentar eliminar al amigo'
        });
    }
};

module.exports = {
    getUserById,
    getUserByEmail,
    getLeaderboard,
    getPerfilPublicoPorCodigo,
    getRachaActual,
    getHistorialRachas,
    enviarSolicitudAmistad,
    responderSolicitudAmistad,
    createUser,
    updateUser,
    updatePassword,
    actualizarRacha,
    verificarRachaExpirada,
    deleteUser,
    deleteAmigo
}