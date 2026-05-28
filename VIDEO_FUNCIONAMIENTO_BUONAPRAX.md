# Video tecnico de funcionamiento - Bounaprax

Objetivo: mostrar todas las funciones principales del sistema en un video tecnico, claro y apto para publicar en redes sociales. La demo debe verse como producto real: datos cargados, recorridos fluidos, pantallas completas y sin informacion sensible.

## Formatos recomendados

- Video principal tecnico: 6 a 8 minutos, formato horizontal 16:9, resolucion 1920x1080.
- Version redes corta: 60 a 90 segundos, formato vertical 9:16, resolucion 1080x1920.
- Clips individuales: 20 a 40 segundos por modulo para Instagram, TikTok, Reels, Shorts y LinkedIn.

## Preparacion antes de grabar

- Usar un usuario de prueba PRO para mostrar reportes, PDF, recibos, WhatsApp y funciones avanzadas.
- Usar un usuario administrador para mostrar gestion de usuarios, planes, permisos y feedback.
- Cargar datos ficticios: pacientes, sesiones, pagos, consultorios, documentos, notas, tareas y recordatorios.
- No mostrar pacientes reales, emails reales, telefonos reales, claves ni datos de Supabase.
- Grabar en navegador con zoom al 100%, modo claro u oscuro segun se vea mejor en redes.
- Tener WhatsApp Web cerrado o usar enlaces de demo sin enviar mensajes reales.

## Estructura del video principal

### 1. Presentacion y acceso

Duracion sugerida: 30 segundos.

Narracion:
"Bounaprax es una plataforma web para profesionales de la salud. Centraliza pacientes, historia clinica, agenda, sesiones, pagos, documentos, reportes y administracion de usuarios en un solo sistema."

Tomas:
- Pantalla de login.
- Explicar que el acceso se realiza por usuario, no por auto-registro.
- Mostrar primer acceso y cambio obligatorio de contrasena, si hay un usuario nuevo disponible.
- Entrar al sistema.

Puntos tecnicos:
- Autenticacion con Supabase.
- Usuario interno construido como usuario arroba bounaprax.com.
- Control de primer acceso mediante cambio de contrasena.
- Proteccion de rutas por middleware.

### 2. Inicio / tablero semanal

Duracion sugerida: 40 segundos.

Narracion:
"Al ingresar, el profesional ve un resumen de su semana: sesiones programadas, cantidad de turnos del dia y agenda agrupada por consultorio."

Tomas:
- Pantalla Inicio.
- Saludo personalizado.
- Indicadores de semana y dia actual.
- Lista de sesiones de la semana.
- Sesiones agrupadas por consultorio.
- Acceso rapido a la agenda.

Puntos tecnicos:
- Datos filtrados por semana actual.
- Agrupacion por consultorio activo.
- Acceso directo a la ficha del paciente desde cada sesion.

### 3. Pacientes

Duracion sugerida: 70 segundos.

Narracion:
"El modulo de pacientes concentra la informacion personal, clinica y administrativa de cada persona atendida."

Tomas:
- Listado de pacientes.
- Estados: activo, inactivo, alta y derivado.
- Datos de contacto, obra social y edad.
- Boton Nuevo paciente.
- Crear paciente con datos personales, cobertura, motivo de consulta, diagnostico, estado y consultorio.
- Editar paciente.
- Eliminar paciente con confirmacion.

Puntos tecnicos:
- Cada profesional ve solo sus propios pacientes.
- Las fichas se organizan con datos personales, cobertura e informacion clinica.
- Soporte para multiple consultorio asociado al paciente.

### 4. Ficha completa del paciente

Duracion sugerida: 90 segundos.

Narracion:
"La ficha del paciente funciona como centro de trabajo clinico: hoja de ruta, sesiones, pagos, tareas y documentos."

Tomas:
- Abrir una ficha de paciente.
- Mostrar resumen superior con estado, edad, cantidad de sesiones, pagos y asistencia.
- Datos personales y clinicos.
- Hoja de ruta editable.
- Vista previa o pantalla completa de hoja de ruta, si esta disponible.
- Exportacion o impresion de hoja de ruta, si el usuario PRO lo permite.

Puntos tecnicos:
- Historia clinica digital centralizada.
- Seguimiento longitudinal por hoja de ruta.
- Acceso rapido a acciones clinicas y administrativas.

### 5. Sesiones

Duracion sugerida: 90 segundos.

Narracion:
"Cada sesion permite registrar fecha, horarios, modalidad, estado, categoria, evolucion clinica, observaciones y honorarios."

Tomas:
- Crear nueva sesion desde ficha de paciente.
- Crear o editar sesion desde agenda.
- Seleccionar paciente, consultorio, fecha, horario.
- Elegir presencial o virtual.
- Marcar estado: asistio, programada, cancelada o inasistencia.
- Usar categorias: sesion, evaluacion, devolucion, tratamiento.
- Completar observaciones, tratamiento, objetivo, evolucion y proximos pasos si aparecen en el formulario.
- Marcar monto y estado de pago.
- Ver sesion ya creada.
- Eliminar sesion con confirmacion.

Puntos tecnicos:
- Las sesiones se conectan con paciente, profesional y consultorio.
- Los estados alimentan reportes de asistencia.
- Los montos se integran con contabilidad.

### 6. Agenda

Duracion sugerida: 80 segundos.

Narracion:
"La agenda permite trabajar por dia, semana o mes, actualizar estados rapidamente y comunicarse con el paciente."

Tomas:
- Vista Dia.
- Vista Semana.
- Vista Mes.
- Boton Hoy.
- Navegar periodos anterior/siguiente.
- Crear sesion desde un dia.
- Abrir una sesion existente.
- Editar fecha, horario, consultorio y estado.
- Usar menu rapido para marcar asistencia, falta, cancelacion o categoria.
- Mostrar generacion de mensaje de WhatsApp de confirmacion si esta disponible en la sesion.

Puntos tecnicos:
- Vista calendario con distribucion por horario.
- Control de solapamientos visuales.
- Mensajes de confirmacion con fecha, hora, paciente, profesional y consultorio.

### 7. Pagos y recibos

Duracion sugerida: 60 segundos.

Narracion:
"Los pagos pueden registrarse asociados a una sesion o como cobros independientes, con estado y tipo de pago."

Tomas:
- Registrar pago desde ficha de paciente.
- Asociar pago a sesion.
- Elegir tipo: efectivo, transferencia, tarjeta, obra social u otro.
- Estados: pagado, pendiente, devuelto.
- Mostrar sincronizacion visual del cobro en la ficha.
- Generar recibo PDF si esta disponible para PRO.

Puntos tecnicos:
- Pagos vinculables a sesiones.
- Control de pendientes.
- Exportacion de comprobantes.

### 8. Documentos

Duracion sugerida: 45 segundos.

Narracion:
"El sistema permite adjuntar documentos al paciente y mantenerlos dentro de su ficha clinica."

Tomas:
- Seccion Documentos.
- Subir archivo de prueba.
- Elegir tipo: informe, foto, analisis, test, historia clinica u otro.
- Ver lista actualizada.
- Descargar documento.
- Eliminar documento si esta disponible.

Puntos tecnicos:
- Storage privado.
- Descarga mediante URL firmada.
- Documentos asociados al paciente y al profesional.

### 9. Notas, tareas y recordatorios

Duracion sugerida: 70 segundos.

Narracion:
"Ademas de la ficha individual, Bounaprax incluye notas, tareas y recordatorios para organizar el seguimiento diario."

Tomas:
- Tarjetas de acceso desde Pacientes.
- Notas clinicas por paciente.
- Tareas globales.
- Tareas dentro de la ficha del paciente.
- Crear tarea, marcar como completada, editar y eliminar.
- Recordatorios globales.

Puntos tecnicos:
- Herramientas operativas para seguimiento.
- Separacion entre datos clinicos, pendientes y alertas.
- Acceso rapido desde el modulo Pacientes.

### 10. Consultorios

Duracion sugerida: 45 segundos.

Narracion:
"El profesional puede administrar multiples consultorios y diferenciarlos visualmente por color."

Tomas:
- Listado de consultorios.
- Crear consultorio con nombre, direccion, ciudad, telefono y color.
- Editar consultorio.
- Activar o desactivar.
- Eliminar.
- Mostrar como el color aparece en agenda, inicio y reportes.

Puntos tecnicos:
- Multi-consultorio.
- Consultorios activos para agenda y pacientes.
- Identificacion visual por color.

### 11. Reportes y contabilidad PRO

Duracion sugerida: 80 segundos.

Narracion:
"El plan PRO habilita reportes mensuales y contabilidad, con indicadores de actividad, asistencia e ingresos."

Tomas:
- Entrar a Reportes con usuario PRO.
- Pestana Estadisticas.
- Ingresos del mes.
- Sesiones realizadas.
- Tasa de asistencia.
- Pacientes activos.
- Sesiones por estado.
- Ingresos por tipo de pago.
- Sesiones realizadas por dia.
- Exportar PDF.
- Pestana Contabilidad.
- Filtros por semana, mes y todo.
- Filtro por tipo de pago.
- Tabla con fecha, paciente, consultorio, tipo, concepto, estado y monto.

Puntos tecnicos:
- Reportes calculados desde sesiones, pagos y pacientes.
- Diferenciacion entre cobros pagados y pendientes.
- Exportacion PDF para presentacion o archivo.

### 12. Administracion

Duracion sugerida: 75 segundos.

Narracion:
"El panel de administracion permite crear usuarios, gestionar accesos, planes, permisos y revisar feedback de usuarios."

Tomas:
- Entrar con usuario admin.
- Estadisticas: total, PRO y Free.
- Crear usuario con nombre, usuario, contrasena temporal, plan inicial y permiso admin.
- Cambiar acceso Free 15 dias o PRO.
- Ver vencimiento de acceso Free.
- Resetear contrasena temporal.
- Dar o quitar permisos de admin.
- Eliminar usuario.
- Ver recomendaciones o feedback recibido.

Puntos tecnicos:
- Panel protegido por perfil admin.
- Creacion centralizada de usuarios.
- Sin auto-registro.
- Control de planes y vencimiento.

### 13. Feedback, tema y cierre de sesion

Duracion sugerida: 35 segundos.

Narracion:
"Desde cualquier pantalla el usuario puede enviar feedback, cambiar el tema visual y cerrar sesion de manera segura."

Tomas:
- Abrir modal Enviar feedback.
- Escribir recomendacion ficticia.
- Mostrar confirmacion.
- Cambiar tema claro/oscuro.
- Cerrar sesion.

Puntos tecnicos:
- Feedback persistido para que el administrador lo revise.
- Preferencia visual por usuario/navegador.
- Cierre de sesion con Supabase Auth.

## Version corta para redes

Duracion sugerida: 60 a 90 segundos.

Estructura:
1. Login e inicio: "Gestion completa para profesionales de la salud."
2. Pacientes: "Historia clinica, datos, sesiones y documentos en una sola ficha."
3. Agenda: "Vista diaria, semanal y mensual con estados rapidos."
4. Sesiones: "Registro clinico, asistencia, honorarios y evolucion."
5. Pagos: "Cobros, pendientes y recibos."
6. Reportes PRO: "Indicadores, contabilidad y PDF."
7. Admin: "Usuarios, planes y permisos."
8. Cierre: "Bounaprax: pacientes, agenda y gestion profesional en un solo lugar."

Texto en pantalla sugerido:
- "Historia clinica digital"
- "Agenda por dia, semana y mes"
- "Sesiones, pagos y asistencia"
- "Documentos privados"
- "Reportes y contabilidad PRO"
- "Gestion de usuarios"

## Clips individuales para redes

- Clip 1: "Como se ve la ficha completa de un paciente"
- Clip 2: "Como crear una sesion y marcar asistencia"
- Clip 3: "Agenda semanal y confirmacion de turnos"
- Clip 4: "Pagos, pendientes y recibos"
- Clip 5: "Reportes para profesionales de salud"
- Clip 6: "Panel admin: usuarios, planes y permisos"

## Checklist de datos de prueba

- 3 pacientes activos, 1 inactivo, 1 con alta.
- 2 consultorios activos con colores distintos.
- 8 a 12 sesiones distribuidas en la semana y el mes.
- Sesiones con estados: realizada, programada, cancelada, inasistencia.
- Sesiones con categorias: sesion, evaluacion, devolucion, tratamiento.
- 4 pagos: efectivo, transferencia, tarjeta y obra social.
- Pagos con estados: pagado, pendiente y devuelto.
- 2 documentos ficticios por paciente.
- 2 notas clinicas.
- 3 tareas, al menos una completada.
- 2 recordatorios.
- 1 usuario Free, 1 usuario PRO y 1 usuario admin.
- 2 mensajes de feedback ficticios.

## Recomendaciones de grabacion

- Grabar primero el video horizontal completo.
- Luego recortar vertical los momentos mas visuales: agenda, ficha de paciente, reportes y admin.
- Evitar esperas largas de carga; si una pantalla demora, cortar la pausa en edicion.
- Usar cursor visible y movimientos lentos.
- No escribir datos reales durante la grabacion.
- Narracion tecnica, directa y orientada a funcionamiento real.
- Para redes, agregar subtitulos grandes y frases cortas.

## Pendiente para poder grabarlo de punta a punta

Para grabar el video real necesito acceso a una sesion de prueba:

- Usuario PRO de prueba.
- Usuario admin de prueba.
- Confirmacion de que se pueden usar datos ficticios.
- Definir si el video final va con voz en off, subtitulos o ambos.

