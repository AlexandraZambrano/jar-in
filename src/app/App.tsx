import { RouterProvider } from 'react-router-dom';
import { RxdbProvider } from '@/db/RxdbProvider';
import { router } from './routes';

export function App() {
  return (
    <RxdbProvider>
      <RouterProvider router={router} />
    </RxdbProvider>
  );
}
