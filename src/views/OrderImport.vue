<template>
  <div class="order-import-page">
    <div class="page-header">
      <h2>批量下单导入</h2>
    </div>

    <!-- 步骤条 -->
    <el-steps :active="currentStep" finish-status="success" simple class="steps-bar">
      <el-step title="上传文件" />
      <el-step title="确认映射" />
      <el-step title="数据预览" />
      <el-step title="提交结果" />
    </el-steps>

    <!-- 步骤1：上传文件 -->
    <div v-if="currentStep === 0" class="step-content">
      <el-upload
        class="upload-area"
        drag
        action=""
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
        accept=".xlsx,.xls"
      >
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div class="upload-text">
          <div>将 Excel 文件拖到此处，或 <em>点击上传</em></div>
          <div class="upload-hint">支持 .xlsx / .xls 格式，支持 1000+ 条数据导入</div>
        </div>
      </el-upload>
      <div v-if="loading && parseProgress < 100" class="progress-wrap">
        <el-progress :percentage="parseProgress" status="active" />
        <p>正在解析 Excel 文件...</p>
      </div>
    </div>

    <!-- 步骤2：确认映射（对话框形式） -->
    <el-dialog v-model="showMappingDialog" title="确认字段映射" width="650px" :close-on-click-modal="false">
      <p class="mapping-tip">
        系统自动识别了以下字段映射，请确认或手动调整。确认后将保存映射规则，下次上传相同结构模板时自动应用。
      </p>
      <el-table :data="mappingRows" border size="small" class="mapping-table">
        <el-table-column prop="label" label="系统字段" width="130" />
        <el-table-column prop="required" label="必填" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.required" type="danger" size="small">必填</el-tag>
            <el-tag v-else type="info" size="small">选填</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Excel 列" min-width="280">
          <template #default="{ row }">
            <el-select v-model="mapping[row.field]" placeholder="请选择对应列" clearable style="width: 100%">
              <el-option label="-- 未选择 --" :value="undefined" />
              <el-option
                v-for="(h, idx) in rawHeaders"
                :key="idx"
                :label="h"
                :value="idx"
              />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="showMappingDialog = false">取消</el-button>
        <el-button type="primary" @click="applyMapping">确认映射</el-button>
      </template>
    </el-dialog>

    <!-- 步骤3：数据预览 -->
    <div v-if="currentStep === 1" class="step-content">
      <div class="preview-toolbar">
        <div class="toolbar-left">
          <el-tag type="info">共 {{ tableData.length }} 条数据</el-tag>
          <el-tag v-if="allErrors.length > 0" type="danger">{{ allErrors.length }} 处错误</el-tag>
          <el-tag v-else type="success">数据校验通过</el-tag>
        </div>
        <div class="toolbar-right">
          <el-button type="primary" size="small" @click="addRow">+ 新增一行</el-button>
          <el-button size="small" @click="exportPreview">导出预览</el-button>
          <el-button type="success" size="small" :disabled="allErrors.length > 0 || tableData.length === 0" @click="handleSubmit">
            提交下单
          </el-button>
          <el-button size="small" @click="resetImport">重新上传</el-button>
        </div>
      </div>

      <!-- 错误汇总 -->
      <el-alert v-if="allErrors.length > 0" type="error" :closable="false" class="error-alert">
        <template #title>
          <span>共发现 {{ allErrors.length }} 处错误，请修正后再提交</span>
        </template>
        <div class="error-list">
          <div v-for="(err, idx) in displayedErrors" :key="idx" class="error-item">
            第 {{ err.row }} 行，{{ FIELD_LABELS[err.field] || err.field }}：{{ err.message }}
          </div>
          <div v-if="allErrors.length > 20" class="error-more">...还有 {{ allErrors.length - 20 }} 处错误</div>
        </div>
      </el-alert>

      <!-- 预览表格 -->
      <div class="table-wrap">
        <el-table
          :data="tableData"
          border
          stripe
          size="small"
          max-height="520"
          class="preview-table"
          v-loading="loading"
        >
          <el-table-column type="index" width="45" fixed="left" />
          <el-table-column label="操作" width="60" fixed="left">
            <template #default="{ $index }">
              <el-button type="danger" size="small" text @click="removeRow($index)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </template>
          </el-table-column>

          <el-table-column
            v-for="col in displayColumns"
            :key="col.key"
            :prop="col.key"
            :label="col.label"
            :width="col.width"
            :min-width="col.minWidth"
            show-overflow-tooltip
          >
            <template #default="{ row, $index }">
              <div
                :class="['cell-wrap', { 'cell-error': getCellErrors($index, col.key).length > 0 }]"
                @click="startEdit($index, col.key)"
              >
                <template v-if="isEditing($index, col.key)">
                  <el-input
                    v-model="row[col.key]"
                    size="small"
                    :placeholder="col.key === 'temperature_layer' ? '常温/冷藏/冷冻' : ''"
                    @blur="stopEdit"
                    @keydown.enter.prevent="stopEdit"
                    @keydown.tab.prevent="handleTab($index, col.key)"
                    ref="cellInputRef"
                  />
                </template>
                <template v-else>
                  <span :class="{ 'text-error': getCellErrors($index, col.key).length > 0 }">
                    {{ row[col.key] === '' || row[col.key] === undefined || row[col.key] === null ? '-' : row[col.key] }}
                  </span>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 步骤4：提交结果 -->
    <div v-if="currentStep === 2" class="step-content result-step">
      <el-result
        :icon="submitResult?.success ? 'success' : 'error'"
        :title="submitResult?.success ? '提交完成' : '提交失败'"
        :sub-title="submitResult?.message || ''"
      >
        <template #extra>
          <div v-if="submitResult?.success" class="result-stats">
            <el-statistic title="成功" :value="submitResult.successCount || 0" value-style="color: #67c23a" />
            <el-statistic title="失败" :value="submitResult.failCount || 0" value-style="color: #f56c6c" />
          </div>
          <div class="result-actions">
            <el-button type="primary" @click="goToList">查看运单列表</el-button>
            <el-button @click="resetImport">继续导入</el-button>
          </div>
        </template>
      </el-result>
    </div>

    <!-- 提交进度 -->
    <el-dialog v-model="showSubmitProgress" title="提交下单中" width="400px" :close-on-click-modal="false" :show-close="false">
      <el-progress :percentage="submitProgress" status="active" />
      <p class="progress-text">正在提交数据，请稍候...</p>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useOrderStore } from '@/stores/order'
import * as XLSX from 'xlsx'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Delete } from '@element-plus/icons-vue'

const router = useRouter()
const orderStore = useOrderStore()

const currentStep = ref(0)
const fileName = ref('')
const rawHeaders = ref([])
const rawData = ref([])
const mapping = ref({})
const fingerprint = ref('')
const showMappingDialog = ref(false)
const tableData = ref([])
const editingCell = ref({ rowIndex: -1, field: '' })
const loading = ref(false)
const parseProgress = ref(0)
const submitProgress = ref(0)
const showSubmitProgress = ref(false)
const submitResult = ref(null)
const allErrors = ref([])
const cellInputRef = ref(null)

const FIELD_LABELS = {
  ext_code: '外部编码',
  sender_name: '发件人姓名',
  sender_phone: '发件人电话',
  sender_address: '发件人地址',
  receiver_name: '收件人姓名',
  receiver_phone: '收件人电话',
  receiver_address: '收件人地址',
  weight: '重量',
  quantity: '件数',
  temperature_layer: '温层',
  remark: '备注'
}

const mappingRows = [
  { field: 'ext_code', label: '外部编码', required: false },
  { field: 'sender_name', label: '发件人姓名', required: true },
  { field: 'sender_phone', label: '发件人电话', required: true },
  { field: 'sender_address', label: '发件人地址', required: true },
  { field: 'receiver_name', label: '收件人姓名', required: true },
  { field: 'receiver_phone', label: '收件人电话', required: true },
  { field: 'receiver_address', label: '收件人地址', required: true },
  { field: 'weight', label: '重量(kg)', required: true },
  { field: 'quantity', label: '件数', required: true },
  { field: 'temperature_layer', label: '温层', required: true },
  { field: 'remark', label: '备注', required: false }
]

const displayColumns = [
  { key: 'ext_code', label: '外部编码', width: 120 },
  { key: 'sender_name', label: '发件人姓名', width: 110 },
  { key: 'sender_phone', label: '发件人电话', width: 130 },
  { key: 'sender_address', label: '发件人地址', minWidth: 180 },
  { key: 'receiver_name', label: '收件人姓名', width: 110 },
  { key: 'receiver_phone', label: '收件人电话', width: 130 },
  { key: 'receiver_address', label: '收件人地址', minWidth: 180 },
  { key: 'weight', label: '重量(kg)', width: 90 },
  { key: 'quantity', label: '件数', width: 70 },
  { key: 'temperature_layer', label: '温层', width: 80 },
  { key: 'remark', label: '备注', minWidth: 120 }
]

const displayedErrors = computed(() => allErrors.value.slice(0, 20))

const REQUIRED_FIELDS = ['sender_name', 'sender_phone', 'sender_address', 'receiver_name', 'receiver_phone', 'receiver_address', 'weight', 'quantity', 'temperature_layer']
const TEMPERATURE_OPTIONS = ['常温', '冷藏', '冷冻']

function normalizePhone(phone) {
  return String(phone).trim().replace(/[-\s]/g, '')
}

function validateRow(row, index, allRows) {
  const errors = []

  for (const field of REQUIRED_FIELDS) {
    const val = row[field]
    if (val === undefined || val === null || String(val).trim() === '') {
      errors.push({ row: index + 1, field, message: `${FIELD_LABELS[field]}为必填项` })
    }
  }

  const phoneRegex = /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/
  if (row.sender_phone && !phoneRegex.test(normalizePhone(row.sender_phone))) {
    errors.push({ row: index + 1, field: 'sender_phone', message: '发件人电话格式错误' })
  }
  if (row.receiver_phone && !phoneRegex.test(normalizePhone(row.receiver_phone))) {
    errors.push({ row: index + 1, field: 'receiver_phone', message: '收件人电话格式错误' })
  }

  if (row.weight !== '' && row.weight !== undefined && row.weight !== null) {
    const w = Number(row.weight)
    if (isNaN(w) || w <= 0) {
      errors.push({ row: index + 1, field: 'weight', message: '重量必须为正数' })
    }
  }

  if (row.quantity !== '' && row.quantity !== undefined && row.quantity !== null) {
    const q = Number(row.quantity)
    if (!Number.isInteger(q) || q <= 0) {
      errors.push({ row: index + 1, field: 'quantity', message: '件数必须为正整数' })
    }
  }

  if (row.temperature_layer && !TEMPERATURE_OPTIONS.includes(String(row.temperature_layer).trim())) {
    errors.push({ row: index + 1, field: 'temperature_layer', message: '温层必须为：常温、冷藏、冷冻之一' })
  }

  if (row.ext_code) {
    const code = String(row.ext_code).trim()
    const dupIndex = allRows.findIndex((r, i) => i !== index && String(r.ext_code).trim() === code)
    if (dupIndex !== -1) {
      errors.push({ row: index + 1, field: 'ext_code', message: `外部编码"${code}"与第 ${dupIndex + 1} 行重复` })
    }
  }

  return errors
}

// 判断一行是否可能是表头行
function isHeaderRow(row) {
  if (!row || row.length === 0) return false
  const nonEmpty = row.filter(cell => String(cell).trim() !== '')
  if (nonEmpty.length < 3) return false // 表头至少要有3个有效列
  // 检查是否全是说明文字（比如"说明："开头）
  const firstCell = String(row[0] || '').trim()
  if (firstCell.length > 20 && (firstCell.includes('说明') || firstCell.includes('必填'))) return false
  return true
}

// 判断一行是否是纯说明/空行
function isInfoRow(row) {
  if (!row || row.length === 0) return true
  const nonEmpty = row.filter(cell => String(cell).trim() !== '')
  if (nonEmpty.length === 0) return true
  if (nonEmpty.length === 1) {
    const text = String(row[0] || '').trim()
    if (text.length > 15 || text.includes('说明') || text.includes('必填') || text.includes('可选')) return true
  }
  return false
}

// 判断一行是否是分组表头（如"发件方信息""收件方信息"）
function isGroupHeaderRow(row, nextRow) {
  if (!row || row.length === 0) return false
  const nonEmpty = row.filter(cell => String(cell).trim() !== '')
  if (nonEmpty.length < 2) return false
  // 如果当前行包含"信息""货物"等词，且下一行更像表头
  const rowText = row.map(c => String(c)).join('')
  const hasGroupKeywords = /信息|货物|数据|订单|发件|收件|发货|收货/.test(rowText)
  if (!hasGroupKeywords) return false
  // 检查下一行是否更像标准表头
  if (!nextRow) return false
  const nextNonEmpty = nextRow.filter(cell => String(cell).trim() !== '')
  if (nextNonEmpty.length > nonEmpty.length) return true
  return false
}

// 在多个Sheet中选择最合适的
function selectBestSheet(workbook) {
  const candidates = []
  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    // 跳过明显是说明页的Sheet
    if (/说明|指南|guide|instruction|readme/i.test(sheetName) && jsonData.length <= 10) continue
    // 找到表头行
    let headerIdx = -1
    for (let i = 0; i < Math.min(jsonData.length, 10); i++) {
      if (isHeaderRow(jsonData[i]) && !isInfoRow(jsonData[i])) {
        headerIdx = i
        break
      }
    }
    // 如果第0行像分组表头，检查第1行
    if (headerIdx === 0 && jsonData.length > 1 && isGroupHeaderRow(jsonData[0], jsonData[1])) {
      headerIdx = 1
    }
    if (headerIdx >= 0) {
      candidates.push({ sheetName, jsonData, headerIdx, dataRows: jsonData.length - headerIdx - 1 })
    }
  }
  // 优先选择数据行最多的Sheet
  candidates.sort((a, b) => b.dataRows - a.dataRows)
  return candidates.length > 0 ? candidates[0] : null
}

// 在单个Sheet中检测表头和数据起始行
function detectHeaderAndData(jsonData) {
  let idx = 0
  // 跳过开头的空行和说明行
  while (idx < jsonData.length && isInfoRow(jsonData[idx])) {
    idx++
  }
  if (idx >= jsonData.length) return null

  // 检查是否是分组表头
  if (isGroupHeaderRow(jsonData[idx], jsonData[idx + 1])) {
    return { headerRowIndex: idx + 1, dataStartIndex: idx + 2 }
  }

  return { headerRowIndex: idx, dataStartIndex: idx + 1 }
}

function handleFileChange(file) {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    ElMessage.error('请上传 .xlsx 或 .xls 格式的 Excel 文件')
    return false
  }

  fileName.value = file.name
  loading.value = true
  parseProgress.value = 0

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      parseProgress.value = 30
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array', cellFormula: false, cellHTML: false })
      parseProgress.value = 60

      // 智能选择Sheet
      const best = selectBestSheet(workbook)
      if (!best) {
        ElMessage.error('未能从文件中识别出有效的数据表，请检查文件格式')
        loading.value = false
        return
      }

      const { jsonData, headerIdx, dataRows } = best
      parseProgress.value = 80

      if (jsonData.length === 0) {
        ElMessage.error('文件为空')
        loading.value = false
        return
      }

      rawHeaders.value = jsonData[headerIdx].map(h => String(h).trim())
      rawData.value = jsonData.slice(headerIdx + 1).filter(row => row.some(cell => String(cell).trim() !== ''))

      // 调试日志
      console.log('[Upload] headers:', rawHeaders.value)
      console.log('[Upload] first data row:', rawData.value[0])
      console.log('[Upload] total data rows:', rawData.value.length)

      if (rawData.value.length === 0) {
        ElMessage.error('没有有效数据行')
        loading.value = false
        return
      }

      parseProgress.value = 100
      analyzeTemplate()
    } catch (err) {
      console.error('Parse error:', err)
      ElMessage.error('文件解析失败：' + err.message)
      loading.value = false
    }
  }
  reader.onerror = () => {
    ElMessage.error('文件读取失败')
    loading.value = false
  }
  reader.readAsArrayBuffer(file.raw)
  return false
}

async function analyzeTemplate() {
  try {
    const res = await orderStore.analyzeTemplate(rawHeaders.value)
    if (!res.success) {
      ElMessage.error(res.message || '模板分析失败')
      loading.value = false
      return
    }

    fingerprint.value = res.fingerprint

    // 转换映射格式为 { field: index }
    if (res.historyMapping) {
      const hm = {}
      for (const [field, info] of Object.entries(res.historyMapping)) {
        if (info && info.index !== undefined) hm[field] = info.index
      }
      mapping.value = hm
    } else if (res.autoMapping) {
      const am = {}
      for (const [field, info] of Object.entries(res.autoMapping)) {
        if (info && info.index !== undefined) am[field] = info.index
      }
      mapping.value = am
    } else {
      mapping.value = {}
    }

    showMappingDialog.value = true
    loading.value = false
  } catch (err) {
    console.error('Analyze error:', err)
    ElMessage.error('模板分析失败')
    loading.value = false
  }
}

async function applyMapping() {
  showMappingDialog.value = false
  loading.value = true
  currentStep.value = 2

  // 保存映射到后端
  const mappingForSave = {}
  for (const [field, idx] of Object.entries(mapping.value)) {
    if (idx !== undefined && idx !== null && idx >= 0 && idx < rawHeaders.value.length) {
      mappingForSave[field] = { header: rawHeaders.value[idx], index: idx }
    }
  }
  if (Object.keys(mappingForSave).length > 0) {
    orderStore.saveTemplate(fingerprint.value, rawHeaders.value, mappingForSave).catch(() => {})
  }

  // 调试日志
  console.log('[Mapping] mapping:', JSON.parse(JSON.stringify(mapping.value)))

  // 转换数据
  const converted = rawData.value.map((row, index) => {
    const item = {
      _rowIndex: index,
      ext_code: '',
      sender_name: '',
      sender_phone: '',
      sender_address: '',
      receiver_name: '',
      receiver_phone: '',
      receiver_address: '',
      weight: '',
      quantity: '',
      temperature_layer: '',
      remark: ''
    }
    for (const [field, colIndex] of Object.entries(mapping.value)) {
      if (colIndex !== undefined && colIndex !== null && colIndex >= 0 && colIndex < row.length) {
        item[field] = row[colIndex]
      }
    }
    if (index === 0) {
      console.log('[Mapping] first mapped item:', JSON.parse(JSON.stringify(item)))
      console.log('[Mapping] first raw row length:', row.length)
    }
    return item
  })

  tableData.value = converted
  validateAll()
  console.log('[Validate] total errors:', allErrors.value.length)
  console.log('[Validate] errors:', JSON.parse(JSON.stringify(allErrors.value)))
  currentStep.value = 1
  loading.value = false
}

function validateAll() {
  const errors = []
  tableData.value.forEach((row, index) => {
    const errs = validateRow(row, index, tableData.value)
    row._errors = errs
    errors.push(...errs)
  })
  allErrors.value = errors
}

function getCellErrors(rowIndex, field) {
  const row = tableData.value[rowIndex]
  if (!row || !row._errors) return []
  return row._errors.filter(e => e.field === field)
}

function isEditing(rowIndex, field) {
  return editingCell.value.rowIndex === rowIndex && editingCell.value.field === field
}

function startEdit(rowIndex, field) {
  editingCell.value = { rowIndex, field }
  nextTick(() => {
    const input = cellInputRef.value?.$el?.querySelector('input')
    if (input) input.focus()
  })
}

function stopEdit() {
  const { rowIndex } = editingCell.value
  editingCell.value = { rowIndex: -1, field: '' }
  if (rowIndex >= 0) {
    validateAll()
  }
}

function handleTab(rowIndex, field) {
  const keys = displayColumns.map(c => c.key)
  const colIdx = keys.indexOf(field)
  const nextColIdx = (colIdx + 1) % keys.length
  const nextRowIndex = colIdx + 1 >= keys.length ? rowIndex + 1 : rowIndex

  if (nextRowIndex < tableData.value.length) {
    editingCell.value = { rowIndex: nextRowIndex, field: keys[nextColIdx] }
    nextTick(() => {
      const input = cellInputRef.value?.$el?.querySelector('input')
      if (input) input.focus()
    })
  } else {
    stopEdit()
  }
}

function addRow() {
  tableData.value.push({
    _rowIndex: tableData.value.length,
    ext_code: '',
    sender_name: '',
    sender_phone: '',
    sender_address: '',
    receiver_name: '',
    receiver_phone: '',
    receiver_address: '',
    weight: '',
    quantity: '',
    temperature_layer: '',
    remark: '',
    _errors: []
  })
  validateAll()
}

function removeRow(index) {
  tableData.value.splice(index, 1)
  validateAll()
}

function exportPreview() {
  const rows = tableData.value.map(row => ({
    '外部编码': row.ext_code,
    '发件人姓名': row.sender_name,
    '发件人电话': row.sender_phone,
    '发件人地址': row.sender_address,
    '收件人姓名': row.receiver_name,
    '收件人电话': row.receiver_phone,
    '收件人地址': row.receiver_address,
    '重量(kg)': row.weight,
    '件数': row.quantity,
    '温层': row.temperature_layer,
    '备注': row.remark
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '预览数据')
  XLSX.writeFile(wb, '运单预览.xlsx')
}

async function handleSubmit() {
  validateAll()
  if (allErrors.value.length > 0) {
    ElMessage.error('数据存在错误，请修正后再提交')
    return
  }

  if (tableData.value.length === 0) {
    ElMessage.error('没有可提交的数据')
    return
  }

  showSubmitProgress.value = true
  submitProgress.value = 0

  const list = tableData.value.map(r => ({
    ext_code: r.ext_code,
    sender_name: r.sender_name,
    sender_phone: r.sender_phone,
    sender_address: r.sender_address,
    receiver_name: r.receiver_name,
    receiver_phone: r.receiver_phone,
    receiver_address: r.receiver_address,
    weight: r.weight,
    quantity: r.quantity,
    temperature_layer: r.temperature_layer,
    remark: r.remark
  }))

  // 模拟进度动画
  const progressTimer = setInterval(() => {
    if (submitProgress.value < 90) submitProgress.value += Math.floor(Math.random() * 10) + 5
  }, 300)

  try {
    const res = await orderStore.batchSubmit(list)
    clearInterval(progressTimer)
    submitProgress.value = 100
    submitResult.value = res
    currentStep.value = 2
    ElMessage.success(res.message || '提交成功')
  } catch (err) {
    clearInterval(progressTimer)
    submitProgress.value = 0
    const errors = err.response?.data?.errors || []
    if (errors.length > 0) {
      allErrors.value = errors
      ElMessage.error('数据校验失败，请修正后再提交')
    } else {
      ElMessage.error(err.response?.data?.message || '提交失败')
    }
  } finally {
    showSubmitProgress.value = false
  }
}

function resetImport() {
  currentStep.value = 0
  fileName.value = ''
  rawHeaders.value = []
  rawData.value = []
  mapping.value = {}
  fingerprint.value = ''
  tableData.value = []
  allErrors.value = []
  submitResult.value = null
  editingCell.value = { rowIndex: -1, field: '' }
}

function goToList() {
  router.push('/order-list')
}
</script>

<style scoped>
.order-import-page { padding: 20px; }
.page-header { margin-bottom: 16px; }
.page-header h2 { margin: 0; }

.steps-bar { margin-bottom: 24px; }

.step-content { margin-top: 20px; }

.upload-area {
  width: 100%;
}
.upload-area :deep(.el-upload) {
  width: 100%;
}
.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.upload-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 12px;
}
.upload-text {
  text-align: center;
}
.upload-text em {
  color: #409eff;
  font-style: normal;
  cursor: pointer;
}
.upload-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.progress-wrap {
  margin-top: 20px;
  text-align: center;
}
.progress-wrap p {
  color: #666;
  margin-top: 8px;
}

.mapping-tip {
  color: #666;
  font-size: 13px;
  margin-bottom: 12px;
}
.mapping-table :deep(.el-select) {
  width: 100%;
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.toolbar-left {
  display: flex;
  gap: 8px;
}
.toolbar-right {
  display: flex;
  gap: 8px;
}

.error-alert { margin-bottom: 12px; }
.error-list {
  max-height: 120px;
  overflow-y: auto;
  font-size: 12px;
  margin-top: 4px;
}
.error-item {
  padding: 2px 0;
  color: #f56c6c;
}
.error-more {
  color: #999;
  padding: 2px 0;
}

.table-wrap {
  overflow-x: auto;
}
.preview-table {
  min-width: 1200px;
}

.cell-wrap {
  min-height: 24px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cell-wrap:hover {
  background-color: #f5f7fa;
}
.cell-error {
  background-color: #fef0f0 !important;
  border: 1px solid #f56c6c;
}
.cell-error:hover {
  background-color: #fde2e2 !important;
}
.text-error {
  color: #f56c6c;
}

.result-step {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}
.result-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 20px;
}
.result-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.progress-text {
  text-align: center;
  color: #666;
  margin-top: 12px;
}
</style>
