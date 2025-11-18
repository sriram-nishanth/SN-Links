import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { useNetwork } from '../Context/NetworkContext';
import NoInternetPage from '../Pages/NoInternetPage';

const NetworkAwareRouter = ({ router }) => {
  const { isOnline } = useNetwork();

  if (!isOnline) {
    return <NoInternetPage />;
  }

  return <RouterProvider router={router} />;
};

export default NetworkAwareRouter;