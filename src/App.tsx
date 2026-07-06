import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import BodyStats from './pages/BodyStats'
import Dashboard from './pages/Dashboard'
import ExerciseDetail from './pages/ExerciseDetail'
import Exercises from './pages/Exercises'
import LogWorkout from './pages/LogWorkout'
import Settings from './pages/Settings'
import Stats from './pages/Stats'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="log" element={<LogWorkout />} />
        <Route path="exercises" element={<Exercises />} />
        <Route path="exercises/:id" element={<ExerciseDetail />} />
        <Route path="body" element={<BodyStats />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
