<template>
  <div class="titlebar-container">
    <!-- 可拖拽区域 (支持双击最大化/还原) -->
    <div class="drag-region" @dblclick="maximizeWindow">
      <div class="app-brand">
        <span class="brand-logo">🎬</span>
        <span class="brand-title">Nexus Player</span>
        <span class="brand-badge">Desktop Pro</span>
      </div>
    </div>

    <!-- 窗口控制动作按钮组 (不可拖拽) -->
    <div class="titlebar-controls" v-if="isElectron">
      <button 
        class="control-btn pin-btn" 
        :class="{ active: isAlwaysOnTop }" 
        @click="toggleAlwaysOnTop" 
        :title="isAlwaysOnTop ? '取消窗口置顶' : '窗口置顶'"
      >
        📌
      </button>

      <button 
        class="control-btn minimize-btn" 
        @click="minimizeWindow" 
        title="最小化"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect fill="currentColor" width="10" height="1.5" x="1" y="5.25" rx="0.75" />
        </svg>
      </button>

      <button 
        class="control-btn maximize-btn" 
        @click="maximizeWindow" 
        :title="isMaximized ? '还原' : '最大化'"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <rect fill="none" stroke="currentColor" stroke-width="1.2" x="1.5" y="1.5" width="9" height="9" rx="1" v-if="!isMaximized" />
          <path fill="none" stroke="currentColor" stroke-width="1.2" d="M3.5 3.5V2.5A1 1 0 0 1 4.5 1.5H9.5A1 1 0 0 1 10.5 2.5V7.5A1 1 0 0 1 9.5 8.5H8.5" v-else />
          <rect fill="none" stroke="currentColor" stroke-width="1.2" x="1.5" y="3.5" width="7" height="7" rx="1" v-if="isMaximized" />
        </svg>
      </button>

      <button 
        class="control-btn close-btn" 
        @click="closeWindow" 
        title="关闭应用"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path stroke="currentColor" stroke-width="1.4" stroke-linecap="round" d="M2 2l8 8M10 2l-8 8" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isElectron = ref(typeof window !== 'undefined' && Boolean((window as any).electronAPI));
const isMaximized = ref(false);
const isAlwaysOnTop = ref(false);

const api = (window as any).electronAPI;

onMounted(async () => {
  if (api) {
    if (api.isMaximized) {
      isMaximized.value = await api.isMaximized();
    }
    if (api.onMaximizedChange) {
      api.onMaximizedChange((maximized: boolean) => {
        isMaximized.value = maximized;
      });
    }
  }
});

const minimizeWindow = () => {
  if (api?.minimizeWindow) api.minimizeWindow();
};

const maximizeWindow = () => {
  if (api?.maximizeWindow) api.maximizeWindow();
};

const closeWindow = () => {
  if (api?.closeWindow) api.closeWindow();
};

const toggleAlwaysOnTop = async () => {
  if (api?.toggleAlwaysOnTop) {
    isAlwaysOnTop.value = await api.toggleAlwaysOnTop();
  }
};
</script>

<style scoped>
.titlebar-container {
  height: 38px;
  background: rgba(11, 15, 25, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  user-select: none;
  z-index: 9999;
  position: relative;
}

.drag-region {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  padding-left: 16px;
  -webkit-app-region: drag;
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-logo {
  font-size: 16px;
}

.brand-title {
  font-size: 13px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.2px;
}

.brand-badge {
  font-size: 9px;
  font-weight: 700;
  color: #818cf8;
  background: rgba(99, 102, 241, 0.18);
  border: 1px solid rgba(99, 102, 241, 0.3);
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
}

.titlebar-controls {
  display: flex;
  align-items: center;
  height: 100%;
  -webkit-app-region: no-drag;
}

.control-btn {
  width: 44px;
  height: 100%;
  background: transparent;
  border: none;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}

.pin-btn.active {
  color: #818cf8;
  background: rgba(99, 102, 241, 0.2);
}

.close-btn:hover {
  background: #ef4444;
  color: #ffffff;
}
</style>
