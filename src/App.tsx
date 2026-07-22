import { HashRouter, Route, Routes } from 'react-router-dom';
import { Map } from './screens/Map';
import { PlayLevel } from './screens/PlayLevel';
import { SkipTest } from './screens/SkipTest';
import { Turbo } from './screens/Turbo';
import { ReadAloud } from './screens/ReadAloud';
import { ParentMode } from './screens/ParentMode';

export function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Map />} />
        <Route path="/play/:levelId" element={<PlayLevel />} />
        <Route path="/skip/:levelId" element={<SkipTest />} />
        <Route path="/turbo/:levelId" element={<Turbo />} />
        <Route path="/read/:levelId" element={<ReadAloud />} />
        <Route path="/parent" element={<ParentMode />} />
      </Routes>
    </HashRouter>
  );
}
