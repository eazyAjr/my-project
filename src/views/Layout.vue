<template>
  <div class="layout-container">
    <div class="layout-header">
      <div class="header-left">
        <span class="header-icon">📚</span>
        <span>图书管理系统</span>
      </div>
      <div class="header-right">
        <el-tag>欢迎，{{ userStore.userInfo?.nickname }}</el-tag>
        <el-button type="danger" text @click="handleLogout">退出登录</el-button>
      </div>
    </div>
    <div class="layout-body">
      <div class="layout-aside">
        <el-menu :default-active="route.path" router>
          <el-menu-item index="/book">
            <el-icon><Reading /></el-icon>
            <span>图书管理</span>
          </el-menu-item>
        </el-menu>
      </div>
      <div class="layout-main">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { Reading } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await userStore.logout()
    router.push('/login')
  } catch {
    // 取消或异常不处理
  }
}
</script>
