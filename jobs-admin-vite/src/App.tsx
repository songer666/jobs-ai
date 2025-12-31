import { Outlet } from 'react-router-dom'
import { App as AntdApp } from 'antd'

function App() {
  return (
    <AntdApp>
      <Outlet />
    </AntdApp>
  )
}

export default App
