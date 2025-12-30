import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { App, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './index.css'
import { SessionProvider } from './lib/session-provider'
import router from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <App>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </App>
    </ConfigProvider>
  </StrictMode>,
)
