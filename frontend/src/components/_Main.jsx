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
    const socketRef = useRef();

    const handleNewMessage = (messages) => {
        // console.log(messages);
        
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
                        newData.idMessages[existingMessageIndex] = { id: key, image: value, timestamp: new Date().getTime() };

                    } else {
                        // newData.idMessages.unshift({ id: key, image: value, timestamp: new Date().getTime() });
                        newData.idMessages.push({ id: key, image: value, timestamp: new Date().getTime() });

                        if (newData.idMessages.length > 15) {
                            // newData.idMessages.pop();
                            // newData.idMessages.shift();
                            newData.idMessages.splice(0, 5);

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
        updateMarqueeMessages(data.systemStatus, data.cameraStatus)
    }, [data]);


    const marqueeMessage = useRef([]);
    const updateMarqueeMessages = (systemStatus, cameraStatus) => {
        const currentTime = new Date().getTime();
        if (Object.keys(systemStatus).length > 0 && (systemStatus.error !== null || (systemStatus.success !== null && currentTime - systemStatus.timestamp < 15000))) {
            const newMessage = {
                message: systemStatus.error ?? systemStatus.success,
                type: systemStatus.error !== null ? "error" : "success",
                timestamp: systemStatus.timestamp,
            };

            marqueeMessage.current = marqueeMessage.current.filter(
                msg => msg.type !== newMessage.type
            );
            marqueeMessage.current.push(newMessage);
        } else {
            marqueeMessage.current = marqueeMessage.current.filter(msg => !msg.type.includes('error') && !msg.type.includes('success'));

            Object.entries(cameraStatus).forEach(([cameraId, status]) => {
                if (status.error !== null || status.success !== null) {
                    const newCameraMessage = {
                        message: `${cameraId}: ${status.error ?? status.success}`,
                        type: status.error !== null ? "error" : "success",
                        timestamp: status.timestamp,
                    };

                    marqueeMessage.current = marqueeMessage.current.filter(
                        msg => msg.type !== newCameraMessage.type || (msg.message && !msg.message.startsWith(`${cameraId}: `))
                    );
                    marqueeMessage.current.push(newCameraMessage);
                }
            });
        }
        marqueeMessage.current = marqueeMessage.current.filter(msg => {
            const messageAge = currentTime - msg.timestamp;
            if (!msg.timestamp) {
                return false;
            }
            if (systemStatus.success !== null && msg.type === "error") {
                if (!msg.message.includes(":"))
                    return messageAge <= 500;
            }

            if (msg.type === "success") {
                if (msg.message === "✅ Facial Recognition Attendance System is Getting Started. Please Wait for 2 Minutes ✅") {
                    return messageAge <= 120000;
                } else {
                    return messageAge <= 15000;
                }
            }
            return true;
        });

        // console.log("Current Message marquee", marqueeMessage.current);
        setForceUpdate(!forceUpdate)
    };
    const columnClass = useRef('col-12')
    const updateColumns = (messages) => {
        console.log(messages)
        const columns = [[], [], []];
        const currentTime = new Date().getTime();
        const filteredMessages = messages.filter(message => (currentTime - message.timestamp < 30000));
        console.log(filteredMessages);
        filteredMessages.forEach((message, index) => {
            if (filteredMessages.length <= 5) {
                // Case 1: All messages in the 0th column
                columns[0].push(message);
            } else if (filteredMessages.length > 5 && filteredMessages.length <= 10) {
                // Case 2: First 5 messages in the 1st column, rest in the 0th column
                if (index < 5) {
                    columns[1].push(message);
                } else {
                    columns[0].push(message);
                }
            } else if (filteredMessages.length > 10) {
                // Case 3: First 5 in the 2nd column, next 5 in the 1st column, rest in the 0th column
                if (index < 5) {
                    columns[2].push(message);
                } else if (index >= 5 && index < 10) {
                    columns[1].push(message);
                } else {
                    columns[0].push(message);
                }
            }
            // const columnIndex = Math.floor(index / 5);
            // columns[columnIndex].push(message);
        });
        messageColumns.current = columns;
        // console.log(messageColumns.current);
        
        setForceUpdate(!forceUpdate);
    };

    return (
        <>
            <main className="flex-shrink-0">
                <div className="d-flex w-100 mx-auto justify-content-center h-full align-items-center">
                    {messageColumns.current.map((column, columnIndex) => {
                        columnClass.current = 'col-12'
                        if (messageColumns.current[1].length > 0) {
                            columnClass.current = 'col-6'
                        }
                        if (messageColumns.current[2].length > 0) {
                            columnClass.current = 'col-4'
                        }

                        return (
                            // <div key={columnIndex} className={`${columnClass.current} d-flex flex-column`}>
                            <div key={columnIndex} className={`col-4 d-flex flex-column mx-auto p-5`}>

                                {column.map((row) => (row.image &&
                                    <div key={row.id} className="d-flex message-row align-items-center">
                                        <img src={`data:image/jpg;base64,${row.image}`} className="d-image" alt={row.id} />
                                        <span className="text -light cha ngecolor fw-bolder display-4 text-bold">{row.id}</span>
                                    </div>
                                ))}
                            </div>)
                    })}
                </div>
            </main>
            <footer>
                <img src="/img/nvidia-logo.png" alt="NVIDIA Logo" />
                <marquee behavior="scroll" className="mr-5" scrollamount="20">{marqueeMessage.current.map((message, idx) => (
                    <span key={idx} className={`mr-4 fw-bolder text-uppercase ${message.type}`}>{message.message}</span>
                ))}</marquee>
            </footer>
        </>
    )
};

export default Main;