import * as XLSX from 'xlsx'

/**
 * 导出数据为 Excel 文件
 * @param {Array} data - 数据数组
 * @param {Array} columns - 列配置 [{ prop, label }]
 * @param {string} fileName - 文件名
 */
export function exportToExcel(data, columns, fileName = '导出数据') {
  const header = columns.map(col => col.label)
  const keys = columns.map(col => col.prop)
  const rows = data.map(item => keys.map(key => item[key] ?? ''))
  const sheetData = [header, ...rows]

  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  // 设置列宽
  ws['!cols'] = columns.map(() => ({ wch: 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

/**
 * 从 Excel 文件导入数据
 * @param {File} file - 上传的文件
 * @param {Array} columns - 列配置 [{ prop, label }]，用于映射表头到字段
 * @returns {Promise<Array>} 解析后的数据数组
 */
export function importFromExcel(file, columns) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 })

        if (jsonData.length < 2) {
          reject(new Error('Excel文件为空或缺少数据'))
          return
        }

        const headerRow = jsonData[0]
        const keyMap = {}
        columns.forEach(col => {
          const idx = headerRow.findIndex(h => h === col.label)
          if (idx !== -1) keyMap[col.prop] = idx
        })

        const result = jsonData.slice(1).map(row => {
          const item = {}
          columns.forEach(col => {
            const idx = keyMap[col.prop]
            item[col.prop] = idx !== undefined ? row[idx] ?? '' : ''
          })
          return item
        }).filter(item => item.title) // 至少要有书名

        resolve(result)
      } catch (err) {
        reject(new Error('Excel文件解析失败：' + err.message))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}
