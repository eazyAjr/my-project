<template>
  <div class="book-manage">
    <div class="page-header">
      <div class="page-title">图书管理</div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-form :model="searchForm" inline>
        <el-form-item label="书名">
          <el-input v-model="searchForm.title" placeholder="请输入书名" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="searchForm.author" placeholder="请输入作者" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.category" placeholder="请选择分类" clearable style="width: 150px">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格 -->
    <div class="table-bar">
      <div class="table-toolbar">
        <div>
          <el-button type="primary" @click="handleAdd">新增图书</el-button>
          <el-button type="success" @click="handleExport">导出Excel</el-button>
          <el-button type="warning" @click="triggerImport">导入Excel</el-button>
          <input
            ref="fileInputRef"
            type="file"
            accept=".xlsx,.xls"
            style="display: none"
            @change="handleImport"
          />
        </div>
        <span style="color: #999; font-size: 13px">共 {{ filteredBooks.length }} 条记录</span>
      </div>

      <el-table :data="pagedBooks" border stripe style="width: 100%" empty-text="暂无数据">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="title" label="书名" min-width="160" show-overflow-tooltip />
        <el-table-column prop="author" label="作者" min-width="130" show-overflow-tooltip />
        <el-table-column prop="isbn" label="ISBN" min-width="160" show-overflow-tooltip />
        <el-table-column prop="category" label="分类" width="110" align="center" />
        <el-table-column prop="price" label="价格(元)" width="100" align="right">
          <template #default="{ row }">{{ row.price?.toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="stock" label="库存" width="80" align="center" />
        <el-table-column prop="publishDate" label="出版日期" width="120" align="center" />
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="display: flex; justify-content: flex-end; margin-top: 16px">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50]"
          :total="filteredBooks.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增图书' : '编辑图书'"
      width="550px"
      destroy-on-close
    >
      <el-form ref="bookFormRef" :model="bookForm" :rules="bookRules" label-width="80px">
        <el-form-item label="书名" prop="title">
          <el-input v-model="bookForm.title" placeholder="请输入书名" />
        </el-form-item>
        <el-form-item label="作者" prop="author">
          <el-input v-model="bookForm.author" placeholder="请输入作者" />
        </el-form-item>
        <el-form-item label="ISBN" prop="isbn">
          <el-input v-model="bookForm.isbn" placeholder="请输入ISBN" />
        </el-form-item>
        <el-form-item label="分类" prop="category">
          <el-select v-model="bookForm.category" placeholder="请选择分类" style="width: 100%">
            <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number v-model="bookForm.price" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="库存" prop="stock">
          <el-input-number v-model="bookForm.stock" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="出版日期" prop="publishDate">
          <el-date-picker v-model="bookForm.publishDate" type="date" value-format="YYYY-MM-DD" placeholder="请选择日期" style="width: 100%" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="bookForm.description" type="textarea" :rows="3" placeholder="请输入描述" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useBookStore } from '@/stores/book'
import { exportToExcel, importFromExcel } from '@/utils/excel'
import { ElMessage, ElMessageBox } from 'element-plus'

const bookStore = useBookStore()

// 分类列表
const categories = ['编程技术', '计算机科学', '科幻小说', '文学小说', '历史人文']

// 搜索
const searchForm = reactive({ title: '', author: '', category: '' })

const filteredBooks = computed(() => {
  return bookStore.books.filter(b => {
    if (searchForm.title && !b.title.includes(searchForm.title)) return false
    if (searchForm.author && !b.author.includes(searchForm.author)) return false
    if (searchForm.category && b.category !== searchForm.category) return false
    return true
  })
})

function handleSearch() {
  pagination.page = 1
}
function handleReset() {
  searchForm.title = ''
  searchForm.author = ''
  searchForm.category = ''
  pagination.page = 1
}

// 分页
const pagination = reactive({ page: 1, size: 10 })
const pagedBooks = computed(() => {
  const start = (pagination.page - 1) * pagination.size
  return filteredBooks.value.slice(start, start + pagination.size)
})

// 对话框
const dialogVisible = ref(false)
const dialogType = ref('add')
const bookFormRef = ref(null)
const editingId = ref(null)

const bookForm = reactive({
  title: '', author: '', isbn: '', category: '',
  price: 0, stock: 0, publishDate: '', description: ''
})

const bookRules = {
  title: [{ required: true, message: '请输入书名', trigger: 'blur' }],
  author: [{ required: true, message: '请输入作者', trigger: 'blur' }],
  category: [{ required: true, message: '请选择分类', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  stock: [{ required: true, message: '请输入库存', trigger: 'blur' }],
}

function resetBookForm() {
  Object.assign(bookForm, {
    title: '', author: '', isbn: '', category: '',
    price: 0, stock: 0, publishDate: '', description: ''
  })
}

function handleAdd() {
  dialogType.value = 'add'
  resetBookForm()
  dialogVisible.value = true
}

function handleEdit(row) {
  dialogType.value = 'edit'
  editingId.value = row.id
  Object.assign(bookForm, {
    title: row.title,
    author: row.author,
    isbn: row.isbn,
    category: row.category,
    price: row.price,
    stock: row.stock,
    publishDate: row.publishDate,
    description: row.description || ''
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await bookFormRef.value.validate().catch(() => false)
  if (!valid) return

  if (dialogType.value === 'add') {
    bookStore.addBook({ ...bookForm })
    ElMessage.success('新增成功')
  } else {
    bookStore.updateBook(editingId.value, { ...bookForm })
    ElMessage.success('编辑成功')
  }
  dialogVisible.value = false
}

function handleDelete(row) {
  ElMessageBox.confirm(`确定要删除《${row.title}》吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    bookStore.deleteBook(row.id)
    ElMessage.success('删除成功')
  }).catch(() => {})
}

// Excel 导出
const excelColumns = [
  { prop: 'title', label: '书名' },
  { prop: 'author', label: '作者' },
  { prop: 'isbn', label: 'ISBN' },
  { prop: 'category', label: '分类' },
  { prop: 'price', label: '价格(元)' },
  { prop: 'stock', label: '库存' },
  { prop: 'publishDate', label: '出版日期' },
  { prop: 'description', label: '描述' }
]

function handleExport() {
  if (filteredBooks.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  exportToExcel(filteredBooks.value, excelColumns, '图书列表')
  ElMessage.success('导出成功')
}

// Excel 导入
const fileInputRef = ref(null)

function triggerImport() {
  fileInputRef.value.click()
}

async function handleImport(e) {
  const file = e.target.files[0]
  if (!file) return

  try {
    const data = await importFromExcel(file, excelColumns)
    if (data.length === 0) {
      ElMessage.warning('未解析到有效数据')
      return
    }
    bookStore.batchAdd(data)
    ElMessage.success(`成功导入 ${data.length} 条数据`)
  } catch (err) {
    ElMessage.error(err.message)
  } finally {
    e.target.value = '' // 清空，允许重复上传同一文件
  }
}
</script>
