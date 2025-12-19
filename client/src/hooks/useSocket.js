import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.DEV
    ? `http://${window.location.hostname}:3000`
    : window.location.origin;

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        socketRef.current = io(SOCKET_URL);

        socketRef.current.on('connect', () => {
            setIsConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            socketRef.current.disconnect();
        };
    }, []);

    return { socket: socketRef.current, isConnected };
};
