import { createBrowserRouter } from 'react-router-dom';

import Playground from '@/components/pages/Playground';

export const router: ReturnType<typeof createBrowserRouter> =
  createBrowserRouter([{ path: '', element: <Playground /> }]);

