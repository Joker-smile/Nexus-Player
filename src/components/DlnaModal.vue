<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3 class="modal-title">投屏到电视</h3>
        <div class="header-actions">
          <button class="refresh-btn" @click="refresh" :disabled="isSearching">
            {{ isSearching ? '搜索中...' : '刷新' }}
          </button>
          <button class="close-modal-btn" @click="close">×</button>
        </div>
      </div>
      
      <div class="modal-body">
        <div v-if="devices.length === 0" class="empty-state">
          <div class="empty-icon">📺</div>
          <p>{{ isSearching ? '正在寻找同一局域网内的电视设备...' : '未发现可用的投屏设备' }}</p>
          <p class="empty-hint" v-if="!isSearching">请确保手机与电视连接在同一个 WiFi 网络</p>
        </div>
        
        <div v-else class="device-list">
          <div 
            v-for="device in devices" 
            :key="device.location"
            class="device-item"
          >
            <div class="device-info">
              <span class="device-icon">📺</span>
              <span class="device-name">{{ device.name }}</span>
            </div>
            <button class="cast-btn" @click="castTo(device)">投屏播放</button>
          </div>
        </div>
      </div>
    </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { dlnaService, DlnaDevice } from '../services/dlna';

const props = defineProps<{
  show: boolean;
  videoUrl?: string;
  videoTitle?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const devices = ref<DlnaDevice[]>([]);
const isSearching = ref(false);
let unsubscribe: (() => void) | null = null;

onMounted(() => {
  unsubscribe = dlnaService.subscribe((devs) => {
    devices.value = devs;
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const refresh = async () => {
  isSearching.value = true;
  await dlnaService.searchDevices();
  setTimeout(() => {
    isSearching.value = false;
  }, 5000);
};

const castTo = async (device: DlnaDevice) => {
  if (!props.videoUrl) return;
  try {
    await dlnaService.playVideo(device, props.videoUrl, props.videoTitle);
    emit('close');
  } catch (e) {
    console.error(e);
    alert('投屏失败，请检查电视网络或重试');
  }
};

const close = () => {
  emit('close');
};

// Export method to expose to parent
defineExpose({
  refresh
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999999;
  padding: 20px;
}

.modal-container {
  width: 100%;
  max-width: 500px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: var(--shadow-main);
  animation: modal-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modal-enter {
  0% { opacity: 0; transform: translateY(20px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  min-height: 58px;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  background: rgba(11, 15, 25, 0.6);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-main);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.close-modal-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.2s;
}

.close-modal-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.modal-body {
  padding: 20px;
  min-height: 200px;
  max-height: 60vh;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-hint {
  font-size: 13px;
  margin-top: 8px;
  opacity: 0.7;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.device-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.device-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--accent-primary);
}

.device-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.device-icon {
  font-size: 24px;
}

.device-name {
  font-weight: 600;
  font-size: 16px;
}

.cast-btn {
  background: var(--accent-gradient);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}
</style>
