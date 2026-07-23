import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../api/client';

export function useCustomerSocket(
  onOrderStatus: (payload: { orderId: string; status: string }) => void,
  onPartnerLocation?: (payload: { orderId: string; lat: number; lng: number }) => void
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('lb_customer_token');
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('order_status', onOrderStatus);
    if (onPartnerLocation) socket.on('partner_location', onPartnerLocation);
    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
