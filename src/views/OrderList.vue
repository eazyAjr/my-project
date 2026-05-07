<template>
  <div class="order-list-page">
    <div class="page-header">
      <h2>已导入运单列表</h2>
      <el-button type="primary" @click="handleExport">导出 Excel</el-button>
    </div>

    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="外部编码">
          <el-input v-model="searchForm.ext_code" placeholder="请输入外部编码" clearable />
        </el-form-item>
        <el-form-item label="收件人姓名">
          <el-input v-model="searchForm.receiver_name" placeholder="请输入收件人姓名" clearable />
        </el-form-item>
        <el-form-item label="提交时间">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <el-table :data="orderStore.orders" border stripe v-loading="loading" max-height="600">
        <el-table-column type="index" width="50" />
        <el-table-column prop="extCode" label="外部编码" width="120" show-overflow-tooltip />
        <el-table-column prop="senderName" label="发件人姓名" width="110" />
        <el-table-column prop="senderPhone" label="发件人电话" width="130" />
        <el-table-column prop="senderAddress" label="发件人地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="receiverName" label="收件人姓名" width="110" />
        <el-table-column prop="receiverPhone" label="收件人电话" width="130" />
        <el-table-column prop="receiverAddress" label="收件人地址" min-width="180" show-overflow-tooltip />
        <el-table-column prop="weight" label="重量(kg)" width="90" />
        <el-table-column prop="quantity" label="件数" width="70" />
        <el-table-column prop="temperatureLayer" label="温层" width="80" />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="提交时间" width="160" />
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" size="small" text @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :total="orderStore.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @change="handlePageChange"
        class="pagination"
      />
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useOrderStore } from '@/stores/order'
import { ElMessage, ElMessageBox } from 'element-plus'

const orderStore = useOrderStore()
const loading = ref(false)
const dateRange = ref([])

const searchForm = reactive({
  ext_code: '',
  receiver_name: ''
})

const pagination = reactive({
  page: 1,
  size: 10
})

async function loadData() {
  loading.value = true
  const params = {
    page: pagination.page,
    size: pagination.size,
    ext_code: searchForm.ext_code || undefined,
    receiver_name: searchForm.receiver_name || undefined
  }
  if (dateRange.value && dateRange.value.length === 2) {
    params.start_time = dateRange.value[0]
    params.end_time = dateRange.value[1]
  }
  await orderStore.getOrders(params)
  loading.value = false
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  searchForm.ext_code = ''
  searchForm.receiver_name = ''
  dateRange.value = []
  pagination.page = 1
  loadData()
}

function handlePageChange() {
  loadData()
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('确定要删除该运单吗？', '提示', { type: 'warning' })
    const res = await orderStore.deleteOrder(row.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadData()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch {
    // 取消
  }
}

async function handleExport() {
  const params = {
    ext_code: searchForm.ext_code || undefined,
    receiver_name: searchForm.receiver_name || undefined
  }
  if (dateRange.value && dateRange.value.length === 2) {
    params.start_time = dateRange.value[0]
    params.end_time = dateRange.value[1]
  }
  await orderStore.exportOrders(params)
  ElMessage.success('导出成功')
}

onMounted(loadData)
</script>

<style scoped>
.order-list-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; }
.search-card { margin-bottom: 16px; }
.table-card { margin-bottom: 16px; }
.pagination { margin-top: 16px; justify-content: flex-end; }
</style>
