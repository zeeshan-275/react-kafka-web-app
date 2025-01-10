import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";

const Main = () => {
    const [data, setData] = useState({
        systemStatus: {},
        cameraStatus: {},
        idMessages: [],
    });
    const [forceUpdate, setForceUpdate] = useState(false);
    const messageColumns = useRef([[], [], []]);
    const messageMarqueeSystem = useRef({});
    const messageMarqueeCamera = useRef({});
    const socketRef = useRef();

    const handleNewMessage = (messages) => {
        messages.forEach((message) => {
            const key = Object.keys(message)[0];
            const value = message[key];
            setData((prevData) => {
                const newData = { ...prevData };
                if (key === 'SUCCESS') {
                    if (newData.systemStatus.success !== value) {
                        newData.systemStatus.success = value
                        newData.systemStatus.error = null
                        newData.systemStatus.timestamp = new Date().getTime();
                    }
                } else if (key === 'ERROR') {
                    if (newData.systemStatus.error !== value) {
                        newData.systemStatus.error = value
                        newData.systemStatus.success = null
                        newData.systemStatus.timestamp = new Date().getTime();
                    }
                } else if (key.startsWith('SUCCESS')) {
                    const cameraId = key.split(' ')[1];
                    if (!newData.cameraStatus[cameraId] || newData.cameraStatus[cameraId].success !== value) {
                        newData.cameraStatus[cameraId] = { success: value, error: null, timestamp: new Date().getTime() };
                    }
                } else if (key.startsWith('ERROR')) {
                    const cameraId = key.split(' ')[1];
                    if (!newData.cameraStatus[cameraId] || newData.cameraStatus[cameraId].error !== value) {
                        newData.cameraStatus[cameraId] = { success: null, error: value, timestamp: new Date().getTime() };
                    }
                } else {
                    const existingMessageIndex = newData.idMessages.findIndex((msg) => msg.id === key);
                    if (existingMessageIndex > -1) {
                        newData.idMessages[existingMessageIndex] = { id: key, image: value, timestamp: newData.idMessages[existingMessageIndex].timestamp };
                    } else {
                        newData.idMessages.unshift({ id: key, image: value, timestamp: new Date().getTime() });
                        if (newData.idMessages.length > 15) {
                            newData.idMessages.pop();
                        }
                    }
                }
                return newData;
            });
        });
    };

    useEffect(() => {
        socketRef.current = io("http://localhost:9090");
        socketRef.current.on("new_message", data => { handleNewMessage(data.message) });
        const intervalId = setInterval(() => {
            socketRef.current.emit("check_updates");
        }, 100);
        const deleteInterval = setInterval(() => {
            const columns = messageColumns.current.flat(2);
            updateColumns(columns)
        }, 1000);
        handleMarqueeEnd()

        return () => {
            socketRef.current.off("new_message", handleNewMessage);
            socketRef.current.off("connect");
            clearInterval(intervalId);
            clearInterval(deleteInterval);
        };
    }, []);


    useEffect(() => {
        if (data.idMessages.length > 0) {
            updateColumns(data.idMessages);
        }
    }, [data]);
    useEffect(() => {
        const attachListener = () => {
            const marqueeElement = document.getElementById('marquee');
            if (marqueeElement) {
                marqueeElement.addEventListener('animationend', handleMarqueeEnd);
                console.log('Event listener attached!');
            } else {
                console.error('Marquee Element not found!');
            }
        };

        const timeoutId = setTimeout(attachListener, 1000);
        return () => {
            clearTimeout(timeoutId);
            const marqueeElement = document.getElementById('marquee');
            if (marqueeElement) {
                marqueeElement.removeEventListener('animationend', handleMarqueeEnd);
            }
        };
    }, [])

    const handleMarqueeEnd = () => {
        console.log("Event listner Fired: ", data);
        messageMarqueeSystem.current = data.systemStatus
        messageMarqueeCamera.current = data.cameraStatus
        // setForceUpdate(!forceUpdate)
    }

    const updateColumns = (messages) => {
        const columns = [[], [], []];
        const currentTime = new Date().getTime();
        const filteredMessages = messages.filter(message => (currentTime - message.timestamp < 15000));
        filteredMessages.forEach((message, index) => {
            const columnIndex = Math.floor(index / 5);
            columns[columnIndex].push(message);
        });
        messageColumns.current = columns;
        setForceUpdate(!forceUpdate);
    };

    return (
        <>
            <main className="flex-shrink-0">
                <div className="d-flex gap-3 w-100 justify-content-around h-full align-items-center">
                    {messageColumns.current.map((column, columnIndex) => (
                        <div key={columnIndex} className="d-flex flex-column gap-3">
                            {column.map((row) => (row.image &&
                                <div key={row.id} className="d-flex align-items-center justify-content-around">
                                    <img src={`data:image/jpg;base64,${row.image}`} className="d-image" alt={row.id} />
                                    <span className="text-light fs-2 text-bold">{row.id}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </main>
            <footer>
                <img src="/img/nvidia-logo.png" alt="NVIDIA Logo" />
                <div className="h1" style={{ overflow: "hidden", whiteSpace: "nowrap", width: "100%", backgroundColor: "tranparent" }}>
                    <div id='marquee' style={{
                        display: "inline-block",
                        paddingLeft: "100%",
                        animation: "scroll 15s linear infinite",
                    }} className={`fw-bolder ${messageMarqueeSystem.current.success !== null ? 'success' : 'error'}`}>
                        {messageMarqueeSystem.current.success || messageMarqueeSystem.current.error ? (
                            <span className={messageMarqueeSystem.current.success ? "success" : "error"}>{messageMarqueeSystem.current.success || messageMarqueeSystem.current.error}</span>
                        ) : (
                            Object.entries(messageMarqueeCamera.current == {} ? data.cameraStatus : messageMarqueeCamera.current).map(([cameraId, message]) => (
                                <span key={cameraId} className={message.error !== null ? 'error' : 'success'} style={{ marginRight: "20px" }}>{message.value}{message.error !== null ? message.error : message.success}</span>
                            ))
                        )
                        }
                    </div>
                </div>
            </footer>
        </>
    )
};

export default Main;