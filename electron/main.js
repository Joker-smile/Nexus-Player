const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
const path = require('path');

// 注入 Chromium 底层高保真音频优化开关，防止重采样抖动与音质沙哑破音
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-features', 'AudioServiceOutOfProcess');
app.commandLine.appendSwitch('force-wave-audio');
// 禁用站点隔离机制和全局 Web 安全限制，彻底解除严格的跨域限制
app.commandLine.appendSwitch('disable-site-isolation-trials');
app.commandLine.appendSwitch('disable-web-security');

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.ico');
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: 'Nexus Player PC Pro',
    icon: iconPath,
    backgroundColor: '#0b0f19',
    frame: false, // 启用桌面无边框现代窗口
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // 允许播放任意第三方 .m3u8 跨域流
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-change', false);
  });

  // 区分开发模式与打包模式
  const isDev = !app.isPackaged && process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 拦截外链并在系统默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// 注册安全 IPC 通信响应
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-toggle-always-on-top', () => {
  if (mainWindow) {
    const isTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isTop);
    return !isTop;
  }
  return false;
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

app.whenReady().then(() => {
  // 拦截全局 HTTP/HTTPS 请求，伪造/修改 Header 绕过视频 CDN 防盗链
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const { requestHeaders } = details;
      
      // 删除会导致跨域失败和触发防盗链的 Origin 字段
      if (requestHeaders['Origin']) delete requestHeaders['Origin'];
      if (requestHeaders['origin']) delete requestHeaders['origin'];

      // 删除本地开发环境的 Referer，部分视频源会阻断包含 localhost 的 Referer
      if (requestHeaders['Referer'] && requestHeaders['Referer'].includes('localhost')) {
        delete requestHeaders['Referer'];
      }
      if (requestHeaders['referer'] && requestHeaders['referer'].includes('localhost')) {
        delete requestHeaders['referer'];
      }

      // 伪装浏览器 User-Agent，防止部分 CDN 屏蔽包含 Electron 标志的请求
      requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      
      callback({ cancel: false, requestHeaders });
    }
  );

  // 暴力注入响应头，彻底解决由于服务端不配合导致的 CORS 拦截问题
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['*://*/*'] },
    (details, callback) => {
      const { responseHeaders } = details;
      
      // 强制写入跨域允许头
      if (responseHeaders) {
        responseHeaders['Access-Control-Allow-Origin'] = ['*'];
        responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS, PUT, DELETE'];
        responseHeaders['Access-Control-Allow-Headers'] = ['*'];
        responseHeaders['Access-Control-Expose-Headers'] = ['*'];
      }
      
      callback({ cancel: false, responseHeaders });
    }
  );

  // 忽略部分视频源可能存在的不受信任或过期 HTTPS 证书
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true); // 允许通过
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
