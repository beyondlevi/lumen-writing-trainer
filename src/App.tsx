import {App} from '@wearables-ui-toolkit/mrbd';
import {
  ReactRouterNavigationProvider,
  ReactRouterPageTransition,
} from '@wearables-ui-toolkit/mrbd/react-router';
import {BrowserRouter, Navigate, Route, Routes, useLocation} from 'react-router-dom';
import {Home, HOME_PATH} from './pages/HomePage';
import {ProgressPage} from './pages/ProgressPage';
import {RESULT_PATH, ResultPage} from './pages/ResultPage';
import {RoundPage} from './pages/RoundPage';
import {Trail, trailPath} from './pages/TrailPage';

// Back (Escape) is handled by ReactRouterNavigationProvider: from a round or
// its result it returns to the trail, from a trail or Progress to Home; on
// Home, with no history left, it is not consumed, so the platform closes the app.
export default function WritingTrainerApp() {
  return (
    <BrowserRouter>
      <ReactRouterNavigationProvider>
        <Screens />
      </ReactRouterNavigationProvider>
    </BrowserRouter>
  );
}

/** Pages kept mounted above the routes (see KeptPage): Back to them draws them at once. */
const KEPT = new Set([HOME_PATH, trailPath('words'), trailPath('phrases')]);

/** Each opening of a round or a result is a page of its own; the others are known by their path. */
function transitionKey({pathname, key}: {pathname: string; key: string}): string {
  return pathname.startsWith('/play/') || pathname === RESULT_PATH ? `${pathname}#${key}` : pathname;
}

function Screens() {
  const {pathname} = useLocation();
  return (
    <App>
      <ReactRouterPageTransition
        className="route-viewport"
        getTransitionKey={transitionKey}
        preservePageState={!KEPT.has(pathname)}>
        {({location}) => (
          <Routes location={location}>
            <Route path={HOME_PATH} element={null} />
            <Route path="/trail/:mode" element={null} />
            <Route path="/play/:mode/:index?" element={<RoundPage />} />
            <Route path={RESULT_PATH} element={<ResultPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
          </Routes>
        )}
      </ReactRouterPageTransition>
      <Home />
      <Trail mode="words" />
      <Trail mode="phrases" />
    </App>
  );
}
