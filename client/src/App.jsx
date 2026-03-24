import { BrowserRouter, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RunDetailPage from './pages/RunDetailPage';
export default function App() {
    return (<BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage dataMode="production"/>}/>
        <Route path="/debug" element={<DashboardPage dataMode="debug"/>}/>
        <Route path="/run/:id" element={<RunDetailPage dataMode="production"/>}/>
        <Route path="/debug/run/:id" element={<RunDetailPage dataMode="debug"/>}/>
      </Routes>
    </BrowserRouter>);
}
