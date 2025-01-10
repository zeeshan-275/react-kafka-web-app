var socket = io.connect('http://' + document.domain + location.port);

var lastUpdate = Date.now();
var clearIntervalTime = 15000;
var errorMessage = '';
var successMessage = '';
var isErrorPersisted = false;
var isSuccessPersisted = false;

socket.on('connect', function () {
    console.log("Connected to server");
});

// socket.on('new_message', function (data_server) {
function getNewMsg() {
    const data = { message: ['ERROR: Camera stream from abesit-main-gate-cam-2 is not accessible. Trying to reconnect in 10 seconds.', 'ERROR: Camera stream from abesit-main-gate-cam-1 is not accessible. Trying to reconnect in 10 seconds.', 'ERROR: Camera abesit-main-gate-cam-2 reconnection unsuccessful. Trying to reconnect in 10 seconds.', 'SUCCESS: Camera abesit-main-gate-cam-1 reconnection unsuccessful. Trying to reconnect in 10 seconds.'] }
    // console.log("Received new message:", data);
    const errorMessages = data.message.filter(item => item.hasOwnProperty('ERROR'));
    const successMessages = data.message.filter(item => item.hasOwnProperty('SUCCESS'));
    updateMessageQueue(data.message)
    console.log(errorMessages);
    console.log(successMessages);



    if (errorMessages.length > 0) {
        errorMessage = errorMessages;
        isErrorPersisted = true;
        isSuccessPersisted = false;
        successMessage = '';
    } else if (successMessages.length > 0) {
        console.log("Success message received:", successMessages);
        successMessage = successMessages;
        isSuccessPersisted = true;
        isErrorPersisted = false;
        errorMessage = '';
        if (successMessage === "✅ Facial Recognition Attendance System is Getting Started. Please Wait for 2 Minutes ✅") {
            setTimeout(() => {
                console.log("Special success message display duration ended.");
                isSuccessPersisted = false;
            }, 120000);
        } else {
            setTimeout(() => {
                console.log("Normal success message display duration ended.");
                isSuccessPersisted = false;
            }, 5000);
        }
    } else if (data.message.length > 0) {
        console.log("Normal messages received:", data.message);
        isErrorPersisted = false;
        errorMessage = '';
    }

    if (isErrorPersisted) {
        console.log("Displaying error message:", errorMessage);
        updateMessage([{ 'ERROR': errorMessage }], 'error');
        // updateMessage(errorMessage, 'error');

    } else if (isSuccessPersisted) {
        console.log("Displaying success message:", successMessage);
        updateMessage([{ 'SUCCESS': successMessage }], 'success');
    } else {
        console.log("Displaying normal messages.");
        updateMessage(data.message, 'normal');
    }
    lastUpdate = Date.now();
    // });
}
let messageQueue = [];
let isMarqueeRunning = false;

function addMessageToQueue(message, type) {
    const exists = messageQueue.some(item => item.message === message && item.type === type);
    if (!exists) {
        messageQueue.push({ message, type });
        console.log(`Added to queue: ${message} (${type})`);
        if (!isMarqueeRunning) {
            processNextMessage();
        }
    } else {
        console.log(`Duplicate message ignored: ${message} (${type})`);
    }
}

function processNextMessage() {
    if (messageQueue.length === 0) {
        isMarqueeRunning = false;
        return;
    }
    isMarqueeRunning = true;
    const { message, type } = messageQueue.shift();
    const errorContainer = document.getElementById('error-container');
    errorContainer.innerHTML = '';
    const textElement = document.createElement('span');
    textElement.className = type;
    textElement.textContent = message;
    errorContainer.appendChild(textElement);
    const displayDuration = type === 'SUCCESS' ? 5000 : 8000;
    setTimeout(() => {
        processNextMessage();
    }, displayDuration);
}

function updateMessageQueue(newMessages) {
    const newErrorMessages = newMessages.filter(item => item.hasOwnProperty('ERROR')).map(item => ({ message: item.ERROR, type: 'error' }));
    const newSuccessMessages = newMessages.filter(item => item.hasOwnProperty('SUCCESS')).map(item => ({ message: item.SUCCESS, type: 'success' }));

    const newQueue = [...newErrorMessages, ...newSuccessMessages];
    messageQueue = messageQueue.filter(queueItem =>
        newQueue.some(newItem => newItem.message === queueItem.message && newItem.type === queueItem.type)
    );
    console.log('Queue after removing outdated messages:', messageQueue);
    newQueue.forEach(newItem => addMessageToQueue(newItem.message, newItem.type));
}

function updateMessage(message, messageType) {
    const container = document.getElementById('rows');
    const error_container = document.getElementById('error-container');
    container.innerHTML = '';
    error_container.innerHTML = '';
    message.forEach(item => {
        const rowElement = document.createElement('tr');
        rowElement.className = 'row';
        const key = Object.keys(item)[0];
        const value = item[key];

        if (key === 'SUCCESS') {
            console.log("Creating SUCCESS message row.");
            // const textElement = document.createElement('span');
            // textElement.classList.add('success');
            // textElement.textContent = value;
            // error_container.appendChild(textElement);
            // item.SUCCESS.map(error => {
            //     const textElement = document.createElement('span');
            //     textElement.classList.add('error');
            //     console.log(error.SUCCESS);
            //     textElement.textContent = error.SUCCESS;
            //     error_container.appendChild(textElement);
            // })
        } else if (key === 'ERROR') {
            // console.log("Creating ERROR message row.");
            // console.log(item);
            // error_container.innerHTML = ''
            // item.ERROR.map(error => {
            //     const textElement = document.createElement('span');
            //     textElement.classList.add('error');
            //     console.log(error.ERROR);
            //     textElement.textContent = error.ERROR;
            //     error_container.appendChild(textElement);
            // })

        } else {
            console.log("Creating normal message row.");
            // Create an image element
            const imageCell = document.createElement('td');
            const imageElement = document.createElement('img');
            imageElement.src = "data:image/jpg;base64," + value;
            imageCell.appendChild(imageElement);

            // Create a text element for row data
            const labelCell = document.createElement('td');
            const textElement = document.createElement('span');
            textElement.classList.add('normal');
            textElement.textContent = key;
            labelCell.appendChild(textElement);

            // Append image and text to row element
            rowElement.appendChild(labelCell);
            rowElement.appendChild(imageCell);
        }

        container.appendChild(rowElement);
    });

    // Adjust text color based on message type
    const errorContainer = document.querySelector('.error');
    const successContainer = document.querySelector('.success');
    const normalContainers = document.querySelectorAll('.normal');
    if (messageType === 'error' && errorContainer) {
        errorContainer.style.color = '#FF0000';
    } else if (messageType === 'success' && successContainer) {
        successContainer.style.color = '#00FF00';
    } else {
        normalContainers.forEach(container => {
            container.style.color = '#FFFFFF';
        });
    }
}

setInterval(function () {
    // socket.emit('check_updates');
    getNewMsg();
}, 1000);

setInterval(function () {
    if (!isErrorPersisted && !isSuccessPersisted && Date.now() - lastUpdate > clearIntervalTime) {
        console.log("Clearing messages due to inactivity.");
        updateMessage([], 'normal');
    }
}, 1000);