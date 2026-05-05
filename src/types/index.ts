export interface Paciente {
  id: string
  professional_id: string
  nombre: string
  apellido: string
  fecha_nacimiento?: string
  dni?: string
  email?: string
  telefono?: string
  obra_social?: string
  numero_afiliado?: string
  motivo_consulta?: string
  diagnostico?: string
  estado: 'activo' | 'inactivo' | 'alta' | 'derivado'
  consultorio_id?: string
  // Facturación
  cuit?: string
  razon_social?: string
  condicion_iva?: string
  direccion_fiscal?: string
  cbu?: string
  alias_cbu?: string
  created_at: string
  updated_at: string
}

export interface Sesion {
  id: string
  paciente_id: string
  professional_id: string
  consultorio_id?: string
  fecha: string
  hora_inicio?: string
  hora_fin?: string
  tipo: 'presencial' | 'virtual'
  estado: 'programada' | 'realizada' | 'cancelada' | 'inasistencia'
  categoria?: string | null
  observaciones?: string
  tratamiento?: string
  objetivo?: string
  evolucion?: string
  proximos_pasos?: string
  monto?: number
  pagado: boolean
  created_at: string
}

export interface Pago {
  id: string
  paciente_id: string
  sesion_id?: string
  professional_id: string
  fecha: string
  monto: number
  tipo: 'efectivo' | 'transferencia' | 'tarjeta' | 'obra_social' | 'otro'
  concepto?: string
  estado: 'pagado' | 'pendiente' | 'devuelto'
  created_at: string
}

export interface Documento {
  id: string
  paciente_id: string
  professional_id: string
  nombre: string
  tipo: 'informe' | 'foto' | 'analisis' | 'test' | 'historia_clinica' | 'otro'
  descripcion?: string
  archivo_url: string
  archivo_nombre: string
  archivo_tipo: string
  archivo_tamanio?: number
  created_at: string
}

export interface Consultorio {
  id: string
  professional_id: string
  nombre: string
  direccion?: string
  ciudad?: string
  telefono?: string
  color: string
  activo: boolean
  created_at: string
}

export interface Test {
  id: string
  paciente_id: string
  professional_id: string
  sesion_id?: string
  nombre: string
  fecha: string
  resultado?: string
  observaciones?: string
  archivo_url?: string
  created_at: string
}

export interface PacienteNota {
  id: string
  paciente_id: string
  professional_id: string
  contenido: string
  created_at: string
  updated_at: string
}

export interface Recordatorio {
  id: string
  professional_id: string
  paciente_id: string | null
  titulo: string
  descripcion: string | null
  fecha_recordatorio: string | null
  completado: boolean
  prioridad: 'baja' | 'normal' | 'alta'
  created_at: string
}

export interface Profile {
  id: string
  plan: 'free' | 'pro' | 'optimiza'
  access_expires_at?: string | null
  created_at: string
}
