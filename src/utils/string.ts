export const autoFixTypo = (data: any): any => {
  if (typeof data === 'string') {
    return data.replace(/ ([!?:;])/g, '\u00A0$1')
  }
  if (Array.isArray(data)) {
    return data.map((item) => autoFixTypo(item))
  }
  if (data && typeof data === 'object') {
    const sorted: any = {}
    Object.keys(data).forEach((key) => {
      sorted[key] = autoFixTypo(data[key])
    })
    return sorted
  }
  return data
}
