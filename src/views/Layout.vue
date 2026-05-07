<template>
  <div class="layout-container">
    <div class="layout-header">
      <div class="header-left">
        <span class="header-icon">📦</span>
        <span>万能导入 —— 多模板自动导入下单系统</span>
      </div>
    </div>
    <div class="layout-body">
      <div class="layout-aside">
        <el-menu :default-active="route.path" router>
          <el-menu-item index="/order-import">
            <el-icon><Upload /></el-icon>
            <span>批量下单导入</span>
          </el-menu-item>
          <el-menu-item index="/order-list">
            <el-icon><List /></el-icon>
            <span>已导入运单</span>
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
import { useRoute } from 'vue-router'
import { Upload, List } from '@element-plus/icons-vue'

const route = useRoute()
</script>
