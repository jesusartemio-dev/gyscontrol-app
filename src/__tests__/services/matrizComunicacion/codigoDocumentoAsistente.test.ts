import {
  componerCodigoNexa,
  componerCodigoQroma,
  digitoEtapa,
  detectarEstandarCliente,
  validarFormatoPepNexa,
  CONTRATISTA_SIGLAS,
} from '@/lib/matrizComunicacion/codigoDocumentoAsistente'

describe('digitoEtapa', () => {
  it('mapea las 4 etapas de Nexa a su dígito', () => {
    expect(digitoEtapa('FEL1')).toBe('1')
    expect(digitoEtapa('FEL2')).toBe('2')
    expect(digitoEtapa('FEL3')).toBe('3')
    expect(digitoEtapa('E&C')).toBe('4')
  })
  it('etapa no mapeada o vacía devuelve null — nunca inventa un dígito', () => {
    expect(digitoEtapa('Otra etapa cualquiera')).toBeNull()
    expect(digitoEtapa(null)).toBeNull()
    expect(digitoEtapa(undefined)).toBeNull()
  })
})

describe('componerCodigoNexa', () => {
  it('reproduce el ejemplo real de G300: MX-I790126021-3GYS-0240COR0001-R0', () => {
    const codigo = componerCodigoNexa({
      pep: 'I790126021',
      etapaDigito: digitoEtapa('FEL3')!,
      area: '0240',
      correlativo: '0001',
      revision: '0',
    })
    expect(codigo).toBe('MX-I790126021-3GYS-0240COR0001-R0')
  })

  it('usa GYS como siglas de contratista constante', () => {
    expect(CONTRATISTA_SIGLAS).toBe('GYS')
    const codigo = componerCodigoNexa({ pep: 'X', etapaDigito: '1', area: 'Y', correlativo: '1', revision: 'A' })
    expect(codigo).toContain('1GYS-')
  })

  it('tipoDocumento y disciplina son configurables para futuros documentos (dossier, cronograma...)', () => {
    const codigo = componerCodigoNexa({
      pep: 'I790126021', etapaDigito: '3', area: '0240', correlativo: '0001', revision: '0',
      tipoDocumento: 'DS', disciplina: 'GRL',
    })
    expect(codigo).toBe('DS-I790126021-3GYS-0240GRL0001-R0')
  })

  it('rellena el área/sección con ceros a la izquierda hasta 4 dígitos — caso real del organigrama de G300 ("40" -> "0040")', () => {
    const codigo = componerCodigoNexa({
      pep: '586654', etapaDigito: '1', area: '40', correlativo: '0001', revision: '0', tipoDocumento: 'OR',
    })
    expect(codigo).toBe('OR-586654-1GYS-0040COR0001-R0')
  })

  it('un área ya de 4 dígitos no se toca', () => {
    const codigo = componerCodigoNexa({ pep: 'I790126021', etapaDigito: '3', area: '0240', correlativo: '0001', revision: '0' })
    expect(codigo).toContain('-0240COR')
  })
})

describe('validarFormatoPepNexa', () => {
  it('acepta el formato real de Nexa: 1 letra + 9 dígitos', () => {
    expect(validarFormatoPepNexa('I790126021')).toBe(true)
  })
  it('rechaza un PEP que no calza el formato (caso real detectado en G300)', () => {
    expect(validarFormatoPepNexa('586654')).toBe(false)
  })
  it('rechaza vacío, letras de más, o dígitos de más/menos', () => {
    expect(validarFormatoPepNexa('')).toBe(false)
    expect(validarFormatoPepNexa('AB790126021')).toBe(false)
    expect(validarFormatoPepNexa('I79012602')).toBe(false)
  })
})

describe('componerCodigoQroma', () => {
  it('reproduce el ejemplo real: CPPQ-STD-0-CD-001', () => {
    const codigo = componerCodigoQroma({ planta: 'CPPQ', codgen: 'STD', esp: '0', tipoDocumento: 'CD', correlativo: '001' })
    expect(codigo).toBe('CPPQ-STD-0-CD-001')
  })
})

describe('detectarEstandarCliente', () => {
  it('reconoce Nexa y Qroma por nombre, sin importar mayúsculas', () => {
    expect(detectarEstandarCliente('NEXA Resources Peru S.A.')).toBe('nexa')
    expect(detectarEstandarCliente('nexa resources')).toBe('nexa')
    expect(detectarEstandarCliente('Compañía Minera Qroma')).toBe('qroma')
  })
  it('otros clientes o nombre vacío devuelven null — el botón "Sugerir código" se deshabilita', () => {
    expect(detectarEstandarCliente('Cliente Cualquiera SAC')).toBeNull()
    expect(detectarEstandarCliente(null)).toBeNull()
    expect(detectarEstandarCliente(undefined)).toBeNull()
  })
})
