/**
 * Utilitários para formatação e validação de CPF (Brasil)
 */

export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '')
}

export function formatCPF(cpf: string): string {
  const digits = cleanCPF(cpf).slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

export function isValidCPF(cpf: string): boolean {
  const clean = cleanCPF(cpf)
  if (clean.length !== 11) return false

  // Bloqueia sequências de números repetidos (111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(clean)) return false

  // Cálculo do 1º dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.charAt(9), 10)) return false

  // Cálculo do 2º dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(clean.charAt(10), 10)) return false

  return true
}
